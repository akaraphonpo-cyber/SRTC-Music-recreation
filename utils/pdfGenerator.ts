
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { SRTC_LOGO_URL, COURSE_CODE_MAP } from '../constants';
import { SystemConfig, CourseConfig, StudentWithId } from '../types';
import { FlatGradingItem } from "./grades";

// --- Font Loading Logic ---

// Helper to convert Blob to Base64 using native FileReader (Most robust method)
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove the Data-URI prefix (e.g. "data:application/octet-stream;base64,")
            // to get just the raw base64 string
            const base64 = result.split(',')[1]; 
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const loadThaiFont = async (doc: jsPDF): Promise<boolean> => {
    const fontName = "Sarabun";
    const fontFileName = "Sarabun-Regular.ttf";

    // Check if font is already added
    const fontList = doc.getFontList();
    if (fontList && fontList[fontName]) {
        return true;
    }

    // Use GitHub Raw URL for Google Fonts to avoid CORS issues
    const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';

    try {
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
        
        const blob = await response.blob();
        const base64Font = await blobToBase64(blob);

        // Add font to jsPDF VFS (Virtual File System)
        doc.addFileToVFS(fontFileName, base64Font);
        // Register the font
        doc.addFont(fontFileName, fontName, "normal");
        // Set as active font immediately to ensure it registers
        doc.setFont(fontName);
        
        return true;

    } catch (error) {
        console.warn("Error loading Thai font (primary):", error);
        // Fallback: Try corsproxy as a last resort
        try {
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(fontUrl);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Proxy fetch failed');
            
            const blob = await response.blob();
            const base64Font = await blobToBase64(blob);
            
            doc.addFileToVFS(fontFileName, base64Font);
            doc.addFont(fontFileName, fontName, "normal");
            doc.setFont(fontName);
            return true;
        } catch (retryError) {
            console.warn("All font loading attempts failed (Thai text may not render correctly).", retryError);
            return false;
        }
    }
};

// Helper to load image for PDF with multiple fallbacks
const loadImage = async (url: string): Promise<string | null> => {
    const fetchImage = async (fetchUrl: string) => {
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${fetchUrl}`);
            const blob = await response.blob();
            return await blobToBase64(blob);
        } catch (e) {
            throw e;
        }
    };

    try {
        // 1. Try direct fetch
        return await fetchImage(url);
    } catch (error) {
        // console.warn("Direct fetch failed, trying proxy 1...");
        try {
            // 2. Try corsproxy.io
            return await fetchImage('https://corsproxy.io/?' + encodeURIComponent(url));
        } catch (e2) {
            // console.warn("Proxy 1 failed, trying proxy 2...");
            try {
                // 3. Try allorigins.win
                return await fetchImage('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
            } catch (e3) {
                console.warn("Error loading image from all sources (Image will be skipped):", url);
                return null;
            }
        }
    }
};

// --- Attendance PDF Generation ---

interface AttendanceSummaryRow {
    studentId: string;
    prefix: string;
    firstName: string;
    lastName: string;
    department: string;
    stats: {
        present: number;
        late: number;
        absent: number;
        leave: number;
        totalSessions: number;
        percentage: number;
        effectiveAbsence: number;
        scoreDeduction: number;
        isBanned: boolean;
    };
}

export const generateAttendancePDF = async (courseName: string, data: AttendanceSummaryRow[], config: SystemConfig | null) => {
    // Create PDF in A4 Portrait
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Load Font and Logo in parallel
    const [fontLoaded, logoBase64] = await Promise.all([
        loadThaiFont(doc),
        loadImage(SRTC_LOGO_URL)
    ]);
    
    if (!fontLoaded) {
        // Suppress alert in production-like environments, maybe log warn instead
        console.warn("Font loading failed, falling back to standard fonts.");
    }

    const mainFont = fontLoaded ? "Sarabun" : "helvetica";
    doc.setFont(mainFont, "normal");

    // --- 1. Header Section ---
    
    // Logo Positioning
    let headerStartY = 15;
    if (logoBase64) {
        const logoWidth = 18; 
        const logoHeight = 18; 
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoX = (pageWidth - logoWidth) / 2;
        
        doc.addImage(logoBase64, 'PNG', logoX, 8, logoWidth, logoHeight);
        headerStartY = 32; 
    }
    
    // College/System Name (Top Center)
    doc.setFontSize(16);
    doc.text("วิทยาลัยเทคนิคสุราษฎร์ธานี", 105, headerStartY, { align: "center" });
    doc.setFontSize(14);
    doc.text("รายงานสรุปเวลาเรียน (Attendance Report)", 105, headerStartY + 7, { align: "center" });

    // Draw a line under header
    doc.setLineWidth(0.5);
    doc.line(15, headerStartY + 12, 195, headerStartY + 12);

    // --- 2. Course Info Section ---
    const courseCode = COURSE_CODE_MAP[courseName] || '';
    const displayCourseName = courseCode ? `${courseCode} ${courseName}` : courseName;

    doc.setFontSize(11);
    doc.text(`รหัสวิชา/ชื่อวิชา: ${displayCourseName}`, 15, headerStartY + 20);
    
    // Dynamic Date & Term Info
    const today = new Date();
    const dateStr = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`วันที่พิมพ์: ${dateStr}`, 195, headerStartY + 20, { align: "right" });

    if (config && config.term && config.year) {
        doc.text(`ภาคเรียนที่ ${config.term} ปีการศึกษา ${config.year}`, 195, headerStartY + 26, { align: "right" });
    }

    // --- 3. Table Data Preparation ---
    // Add Percentage column
    const tableColumn = [
        "ที่", 
        "รหัสนักศึกษา", 
        "ชื่อ - สกุล", 
        "แผนกวิชา", 
        "มา", 
        "สาย", 
        "ลา", 
        "ขาด", 
        "สุทธิ",
        "%",  // New Column
        "สิทธิ์"
    ];

    const tableRows = data.map((student, index) => {
        const studentName = `${student.prefix}${student.firstName} ${student.lastName}`;
        const status = student.stats.isBanned ? "หมดสิทธิ์" : "ปกติ";
        
        return [
            index + 1,
            student.studentId,
            studentName,
            student.department,
            student.stats.present,
            student.stats.late,
            student.stats.leave,
            student.stats.absent,
            student.stats.effectiveAbsence, 
            `${student.stats.percentage.toFixed(0)}%`, // Value for New Column
            status
        ];
    });

    // --- 4. Generate Table ---
    // @ts-ignore
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: headerStartY + 32,
        theme: 'grid', 
        styles: {
            font: mainFont, 
            fontSize: 9, 
            cellPadding: 1.5,
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            valign: 'middle',
            overflow: 'linebreak' 
        },
        headStyles: {
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 }, // No.
            1: { halign: 'center', cellWidth: 22 }, // ID
            2: { cellWidth: 'auto' }, // Name 
            3: { cellWidth: 28 }, // Dept (Reduced slightly)
            4: { halign: 'center', cellWidth: 7 }, // Present
            5: { halign: 'center', cellWidth: 7 }, // Late
            6: { halign: 'center', cellWidth: 7 }, // Leave
            7: { halign: 'center', cellWidth: 7 }, // Absent
            8: { halign: 'center', cellWidth: 9, fontStyle: 'bold' }, // Eff. Absence
            9: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }, // Percentage (New)
            10: { halign: 'center', cellWidth: 14 }, // Status
        },
        didParseCell: function(data: any) {
            // Row coloring/Styling logic
            if (data.section === 'body') {
                // Highlight "Banned" status in red
                if (data.column.index === 10) {
                    if (data.cell.raw === 'หมดสิทธิ์') {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [22, 163, 74];
                    }
                }
                // Highlight high absence count
                if (data.column.index === 8) {
                     if (Number(data.cell.raw) > 4) {
                         data.cell.styles.textColor = [220, 38, 38];
                     }
                }
                // Color percentage if too low
                if (data.column.index === 9) {
                    const val = parseInt(data.cell.raw);
                    if (val < 80) {
                        data.cell.styles.textColor = [220, 38, 38]; // Red if < 80%
                    }
               }
            }
        }
    });

    // --- 5. Footer Summary & Signatures ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Summary Stats Box
    const passedCount = data.filter(s => !s.stats.isBanned).length;
    const failedCount = data.filter(s => s.stats.isBanned).length;
    
    doc.setFontSize(10);
    doc.text(`สรุป: มีสิทธิ์สอบ ${passedCount} คน / หมดสิทธิ์สอบ ${failedCount} คน (รวม ${data.length} คน)`, 15, finalY);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    // Line 1: Criteria
    doc.text("เกณฑ์: ขาดเรียน(สุทธิ) เกิน 4 ครั้ง หมดสิทธิ์สอบ | การนับ: ลา 2 ครั้ง = ขาด 1 ครั้ง", 15, finalY + 6);
    // Line 2: Calculation explanation
    doc.text("วิธีคิด %: (มา + สาย) ÷ คาบเรียนทั้งหมด x 100 | หมายเหตุ: สาย/ขาด หักจิตพิสัย 1 คะแนน", 15, finalY + 11);
    
    doc.setTextColor(0, 0, 0); // Reset color

    // Signatures
    const signatureY = finalY + 30;
    const teacherName = (config && config.teacherName) ? config.teacherName : "นายอัครพนธ์ ป้องจันทา";
    
    // Teacher Signature only
    doc.setFontSize(11);
    // Align to the right side area
    doc.text("ลงชื่อ .......................................................... ครูผู้สอน", 150, signatureY, { align: "center" });
    doc.text(`(${teacherName})`, 150, signatureY + 8, { align: "center" });

    // Save File
    doc.save(`Attendance_${courseName}.pdf`);
};

// --- Score Report PDF Generation (Updated for Flattened Config) ---

interface ScoreDataRow extends StudentWithId {
    totalScore: number;
    grade: number;
    itemScores: Record<string, number | string>;
}

export const generateScoreReportPDF = async (
    courseName: string, 
    flatGradingItems: FlatGradingItem[], // Use flattened items for detailed columns
    data: ScoreDataRow[], 
    systemConfig: SystemConfig | null,
    stats: { passed: number, avg: number, max: number, min: number },
    groupName: string = ''
) => {
    // Landscape Mode for Score Sheet due to many columns
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const [fontLoaded, logoBase64] = await Promise.all([
        loadThaiFont(doc),
        loadImage(SRTC_LOGO_URL)
    ]);

    if (!fontLoaded) {
        console.warn("Font loading failed, falling back to standard fonts.");
    }

    const mainFont = fontLoaded ? "Sarabun" : "helvetica";
    doc.setFont(mainFont, "normal");

    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    let headerStartY = 15;
    
    if (logoBase64) {
        const logoWidth = 18;
        const logoHeight = 18;
        // Center the logo above title
        doc.addImage(logoBase64, 'PNG', (pageWidth/2) - (logoWidth/2), 8, logoWidth, logoHeight);
        headerStartY = 32;
    }

    doc.setFontSize(16);
    doc.text("วิทยาลัยเทคนิคสุราษฎร์ธานี", pageWidth / 2, headerStartY, { align: "center" });
    doc.setFontSize(14);
    doc.text("แบบสรุปผลการเรียน (Score Sheet)", pageWidth / 2, headerStartY + 7, { align: "center" });

    // Line
    doc.setLineWidth(0.5);
    doc.line(15, headerStartY + 12, pageWidth - 15, headerStartY + 12);

    // Info
    const courseCode = COURSE_CODE_MAP[courseName] || '';
    const displayCourseName = courseCode ? `${courseCode} ${courseName}` : courseName;
    
    doc.setFontSize(11);
    doc.text(`รหัสวิชา/ชื่อวิชา: ${displayCourseName}`, 15, headerStartY + 20);
    if(groupName) doc.text(`กลุ่ม: ${groupName}`, 15, headerStartY + 26);
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`วันที่พิมพ์: ${dateStr}`, pageWidth - 15, headerStartY + 20, { align: "right" });

    if (systemConfig && systemConfig.term && systemConfig.year) {
        doc.text(`ภาคเรียนที่ ${systemConfig.term} ปีการศึกษา ${systemConfig.year}`, pageWidth - 15, headerStartY + 26, { align: "right" });
    }

    // --- Columns Setup (Multi-Row Header) ---
    // Row 1: Main Names
    const headRow1 = ["ที่", "รหัสนักศึกษา", "ชื่อ - สกุล"];
    // Row 2: Max Scores
    const headRow2 = ["", "", ""];

    // Dynamic Columns from Flattened Items
    flatGradingItems.forEach(item => {
        headRow1.push(item.label);
        headRow2.push(`(${item.max || 0})`);
    });

    // Final Fixed Columns
    headRow1.push("รวม", "เกรด");
    headRow2.push("(100)", "");

    // Combine for autoTable
    const head = [headRow1, headRow2];

    // --- Rows Data ---
    const body = data.map((student, index) => {
        const row = [
            index + 1,
            student.studentId,
            `${student.prefix}${student.firstName} ${student.lastName}`,
        ];

        // Add detailed scores
        flatGradingItems.forEach(item => {
            const val = student.itemScores[item.key];
            row.push(val);
        });

        // Add total and grade
        row.push(student.totalScore.toFixed(0));
        row.push(student.grade.toFixed(1));

        return row;
    });

    // --- Generate Table ---
    // @ts-ignore
    doc.autoTable({
        head: head,
        body: body,
        startY: headerStartY + 35,
        theme: 'grid',
        styles: {
            font: mainFont,
            fontSize: 9,
            cellPadding: 1.5,
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            valign: 'middle',
            halign: 'center' // Default center
        },
        headStyles: {
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            minCellHeight: 8
        },
        columnStyles: {
            0: { cellWidth: 10 }, // No
            1: { cellWidth: 25 }, // ID
            2: { halign: 'left', cellWidth: 'auto' }, // Name
            // Dynamic columns auto-size, but let's give them min width if possible
            // Last 2 columns (Total, Grade)
            [headRow1.length - 2]: { fontStyle: 'bold', cellWidth: 12 },
            [headRow1.length - 1]: { fontStyle: 'bold', cellWidth: 12 }
        },
        didParseCell: function(data: any) {
            // Highlight failing grades
            if (data.section === 'body' && data.column.index === headRow1.length - 1) {
                const grade = parseFloat(data.cell.raw);
                if (grade < 1) {
                    data.cell.styles.textColor = [220, 38, 38];
                }
            }
        }
    });

    // --- Footer Stats & Signatures ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Check for page break needed
    if (finalY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
    }
    
    // Stats Block
    doc.setFontSize(10);
    doc.text(`สรุปผลการเรียน: ผ่าน ${stats.passed} คน / ไม่ผ่าน ${data.length - stats.passed} คน (รวม ${data.length} คน)`, 15, finalY);
    doc.text(`คะแนนเฉลี่ย: ${stats.avg.toFixed(2)} | สูงสุด: ${stats.max} | ต่ำสุด: ${stats.min}`, 15, finalY + 6);

    // Signatures
    const signatureY = finalY + 25;
    const teacherName = (systemConfig && systemConfig.teacherName) ? systemConfig.teacherName : "นายอัครพนธ์ ป้องจันทา";

    doc.setFontSize(11);
    doc.text("ลงชื่อ .......................................................... ครูผู้สอน", pageWidth - 50, signatureY, { align: "center" });
    doc.text(`(${teacherName})`, pageWidth - 50, signatureY + 8, { align: "center" });

    // Save
    doc.save(`ScoreSheet_${courseName}.pdf`);
};
