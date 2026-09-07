// =============================================================
// state.js — สถานะกลางของแอป (แทนตัวแปร global กระจัดกระจายของเดิม)
// =============================================================
// ของเดิมมี `let currentPage`, `let currentViewingCaseId`,
// `let allCasesForStatusUpdate` ประกาศลอยๆ อยู่ในสโคป <script> ใหญ่
// เดียวกันทั้งหมด เสี่ยงชนกับตัวแปรอื่นเมื่อโค้ดโตขึ้น และมองไม่ออกว่า
// จุดไหนแก้ state จุดไหนอ่านอย่างเดียว รวมไว้เป็น object เดียวที่นี่
export const state = {
  // ผู้ใช้งานที่ login อยู่ ณ ขณะนี้ (เติมค่าใน app.js หลัง login สำเร็จ)
  // organizationId ใช้แนบไปกับทุก insert เพื่อผูกแถวใหม่เข้ากับสำนักงาน
  // ที่ถูกต้อง (ฝั่งฐานข้อมูลยังคง "บังคับ" ด้วย RLS with-check อีกชั้นเสมอ
  // ค่าตรงนี้จึงเป็นแค่ความสะดวก ไม่ใช่จุดพึ่งพาด้านความปลอดภัย)
  currentUser: {
    userId: null,
    organizationId: null,
    role: null,
    fullName: null,
  },
  cases: {
    currentPage: 1,
    pageSize: 10,
    searchTerm: "",
    statusFilter: "ALL",
    assignedToMe: false,
    rows: [], // แคชผลลัพธ์หน้าปัจจุบัน ใช้ตอนกดปุ่ม "แก้ไข/เปิดดู" ในแถว
  },
  statusModal: {
    allCasesLite: [], // แคชคดีทั้งหมดไว้ค้นหาแบบพิมพ์กรองสด (client-side filter)
  },
  viewingCaseId: null, // คดีที่กำลังเปิดดูรายละเอียดอยู่ (สำหรับปุ่ม "เพิ่มคู่ความ")
};
