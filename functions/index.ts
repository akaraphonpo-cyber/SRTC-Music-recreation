
import { onCall, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";

// Initialize the Admin SDK only if it's not already initialized.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// This function processes the collection in smaller chunks to avoid hitting
// memory or time limits, and includes robust error handling for each document.
const performStatisticsCalculation = async () => {
  console.log("Starting robust statistics recalculation...");
  try {
    const stats = {
      totalStudents: 0,
      totalCourses: 0,
      departmentCounts: {} as { [key: string]: number },
      courseCounts: {} as { [key: string]: number },
    };
    const uniqueCourses = new Set<string>();
    
    const BATCH_SIZE = 1000;
    
    const studentsQuery = db.collection("students")
      .select("department", "courses", "course")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    let lastDoc: admin.firestore.DocumentSnapshot | null = null;

    while (true) {
      const currentQuery: admin.firestore.Query = lastDoc ? studentsQuery.startAfter(lastDoc) : studentsQuery;
      const snapshot: admin.firestore.QuerySnapshot = await currentQuery.get();
      
      if (snapshot.empty) break;

      console.log(`Processing batch of ${snapshot.size} students...`);
      snapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        try {
          const student = doc.data();
          stats.totalStudents++;

          const dept = student.department;
          if (dept && typeof dept === 'string' && dept.trim() !== '') {
            stats.departmentCounts[dept] = (stats.departmentCounts[dept] || 0) + 1;
          }

          const studentCourses = (student.courses && Array.isArray(student.courses))
              ? student.courses
              : (student.course ? [student.course] : []);

          for (const course of studentCourses) {
            if(course && typeof course === 'string' && course.trim() !== '') {
              stats.courseCounts[course] = (stats.courseCounts[course] || 0) + 1;
              uniqueCourses.add(course);
            }
          }
        } catch (error) {
            console.error(`Skipping malformed student document with ID: ${doc.id}. Error:`, error);
        }
      });

      if (snapshot.docs.length < BATCH_SIZE) {
        break;
      }
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
    
    stats.totalCourses = uniqueCourses.size;

    const configDocRef = db.doc("config/registration");
    await configDocRef.set({ 
      overviewStats: {
        ...stats,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      } 
    }, { merge: true });

    return { success: true, message: "Statistics updated successfully." };

  } catch (error) {
    console.error("Error updating overview statistics:", error);
    if (error instanceof Error) {
        return { success: false, message: `Failed to update statistics: ${error.message}` };
    }
    return { success: false, message: 'An unknown error occurred during statistics update.' };
  }
};
  
// Callable function for stats
export const recalculateStats = onCall(
  { timeoutSeconds: 540, memory: "2GiB" },
  async (request) => {
    try {
        return await performStatisticsCalculation();
    } catch (e: any) {
        return { success: false, message: e.message || "Internal error during recalculation" };
    }
});

/**
 * Sends a message via LINE Messaging API (Push Message).
 */
export const sendLineNotification = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    try {
        const { message, groupKey, testToken, testTargetId } = request.data || {};

        if (!message) {
            return { success: false, message: 'Message is required.' };
        }

        // 1. Get Configuration (Prioritize test params if provided, else fetch from DB)
        let accessToken = testToken;
        let systemConfig = null;

        if (!accessToken) {
            const systemConfigDoc = await db.doc('config/system').get();
            systemConfig = systemConfigDoc.data();
            accessToken = systemConfig?.lineChannelAccessToken;
        }
        
        if (!accessToken) {
            console.warn("LINE Channel Access Token not found.");
            return { success: false, message: "Bot Access Token not configured" };
        }

        // 2. Determine Target ID (Test ID > Specific Group > Default)
        let targetId = testTargetId;

        if (!targetId) {
            if (!systemConfig) {
                 const systemConfigDoc = await db.doc('config/system').get();
                 systemConfig = systemConfigDoc.data();
            }
            
            targetId = systemConfig?.lineDefaultTargetId; // Default Global

            // If a groupKey is provided, check for a specific target ID
            if (groupKey && systemConfig?.groupLineTargetIds && systemConfig.groupLineTargetIds[groupKey]) {
                targetId = systemConfig.groupLineTargetIds[groupKey];
            }
        }

        if (!targetId) {
            console.warn(`No target ID found for groupKey: ${groupKey} and no default set.`);
            return { success: false, message: "Target ID not configured for this group" };
        }

        // 3. Send to LINE Messaging API using Axios
        try {
            await axios.post('https://api.line.me/v2/bot/message/push', {
                to: targetId,
                messages: [
                    {
                        type: 'text',
                        text: message
                    }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });
            
            return { success: true, message: "Notification sent successfully" };

        } catch (axiosError: any) {
            console.error("LINE Messaging API Error:", axiosError.response?.data || axiosError.message);
            const errorDetail = axiosError.response?.data?.message || axiosError.message;
            
            // Specific friendly error messages
            if (errorDetail.includes('Invalid reply token') || errorDetail.includes('Invalid user')) {
                 return { success: false, message: "Invalid Target ID (User/Group ID not found)" };
            }
            if (errorDetail.includes('Authentication failed') || errorDetail.includes('Unauthorized')) {
                 return { success: false, message: "Invalid Access Token" };
            }

            return { 
                success: false, 
                message: `LINE API Error: ${errorDetail}` 
            };
        }

    } catch (error: any) {
      console.error("Failed to send LINE message (Exception):", error);
      return { success: false, message: error.message || 'Internal Cloud Function Error' };
    }
  }
);

/**
 * LINE Webhook to handle events (e.g., user types "id" to get Group ID).
 * This helps users easily find the ID to configure in the system.
 */
export const lineWebhook = onRequest(async (req, res) => {
  // Only allow POST requests from LINE
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const events = req.body.events;
  if (!events || events.length === 0) {
    res.status(200).send("OK");
    return;
  }

  try {
    // Fetch Token from Firestore
    const systemConfigDoc = await db.doc('config/system').get();
    const systemConfig = systemConfigDoc.data();
    const accessToken = systemConfig?.lineChannelAccessToken;

    if (!accessToken) {
      console.error("No access token found in config/system");
      res.status(200).send("No Token Configured"); 
      return;
    }

    for (const event of events) {
      // Check for text message "id"
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();
        
        if (text === 'id' || text === '#id') {
          // Prioritize groupId, then roomId, then userId
          const sourceId = event.source.groupId || event.source.roomId || event.source.userId;
          const replyToken = event.replyToken;
          
          if (sourceId) {
             // Reply with the ID using Axios
             try {
                 await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken: replyToken,
                    messages: [{ type: 'text', text: `ID ของกลุ่ม/ผู้ใช้นี้คือ:\n${sourceId}` }]
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
             } catch (err: any) {
                 console.error("Error replying to LINE:", err.response?.data || err.message);
             }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in LINE Webhook:", error);
  }

  // Always return 200 OK to LINE
  res.status(200).send("OK");
});
