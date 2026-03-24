
// ใส่ URL Endpoint ที่ได้จาก ImageKit ตรงนี้
// ตัวอย่าง: "https://ik.imagekit.io/srtc2025"
// ถ้ายังไม่ได้ทำ CDN ให้ปล่อยว่างไว้ ("") ระบบจะใช้ลิงก์เดิมของ Firebase
const IMAGEKIT_ENDPOINT = "https://ik.imagekit.io/bbu2xbkrj9/"; 

/**
 * แปลง URL ของ Firebase Storage ให้ผ่าน CDN ของ ImageKit
 * @param url ลิงก์ต้นฉบับจาก Firebase
 * @param width ความกว้างที่ต้องการ (px) เพื่อย่อรูปให้เล็กลง
 * @param quality คุณภาพของรูป (1-100)
 */
export const getOptimizedImage = (url: string | undefined, width: number = 800, quality: number = 80): string => {
  if (!url) return '';
  
  // ถ้าไม่มีการตั้งค่า ImageKit หรือไม่ใช่ลิงก์ Firebase ให้คืนค่าเดิม
  if (!IMAGEKIT_ENDPOINT || !url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  try {
    // สร้าง URL Object เพื่อจัดการส่วนต่างๆ
    const urlObj = new URL(url);
    
    // สร้างลิงก์ใหม่โดยเปลี่ยน Host เป็น ImageKit Endpoint
    // วิธีการ: แทนที่ 'https://firebasestorage.googleapis.com' ด้วย IMAGEKIT_ENDPOINT
    // ImageKit จะทำหน้าที่เป็น Proxy ดึงรูปจาก Firebase มา Cache ให้
    
    // ลบ Trailing slash ของ Endpoint ถ้ามี
    const cleanEndpoint = (IMAGEKIT_ENDPOINT as string).replace(/\/$/, '');
    
    // สร้าง Path ใหม่
    // Firebase URL path: /v0/b/[bucket]/o/[file path]
    const newUrl = url.replace('https://firebasestorage.googleapis.com', cleanEndpoint);
    
    // เพิ่ม Parameter สำหรับการปรับแต่งรูป (Transformation)
    // tr=w-[width],q-[quality]
    const separator = newUrl.includes('?') ? '&' : '?';
    return `${newUrl}${separator}tr=w-${width},q-${quality},f-auto`; // f-auto = auto format (webp/avif)

  } catch (e) {
    console.error("Error optimizing image URL", e);
    return url;
  }
};
