// =============================================================
// api/documents.js — ไฟล์แนบคดี (Supabase Storage + ตาราง case_documents)
// =============================================================
import { supabaseClient, DOCUMENTS_BUCKET } from "../config.js";

/** อัปโหลดไฟล์เข้า path ที่ RLS ของ storage.objects อนุญาต แล้วบันทึก metadata */
export async function uploadCaseDocument({ file, caseId, organizationId, uploadedBy }) {
  // path ต้องขึ้นต้นด้วย organization_id เพื่อให้ตรงกับ storage RLS policy
  // (ดู sql/008_case_documents_storage.sql) — ผู้ใช้สำนักงานอื่นจะอัปโหลด/
  // อ่านไฟล์นอก path ของตัวเองไม่ได้เลยแม้จะพยายามปลอม path ก็ตาม เพราะ
  // ฝั่งฐานข้อมูลเช็คจาก organization_id จริงของ session ไม่ใช่ค่าที่ client ส่งมา
  const safeName = file.name.replace(/[^\w.\-ก-๙]/g, "_");
  const path = `${organizationId}/${caseId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabaseClient.storage.from(DOCUMENTS_BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabaseClient.from("case_documents").insert([
    {
      case_id: caseId,
      organization_id: organizationId,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: uploadedBy,
    },
  ]);
  if (insertError) throw insertError;
}

export async function listCaseDocuments(caseId) {
  const { data, error } = await supabaseClient
    .from("case_documents")
    .select("document_id, file_path, file_name, file_size, uploaded_at, profiles ( full_name )")
    .eq("case_id", caseId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** bucket เป็น private เสมอ ต้องขอ signed URL ชั่วคราวถึงจะดาวน์โหลด/เปิดดูได้ */
export async function getSignedDownloadUrl(filePath, expiresInSeconds = 60) {
  const { data, error } = await supabaseClient.storage.from(DOCUMENTS_BUCKET).createSignedUrl(filePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCaseDocument(documentId, filePath) {
  const { error: storageError } = await supabaseClient.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
  if (storageError) throw storageError;
  const { error: rowError } = await supabaseClient.from("case_documents").delete().eq("document_id", documentId);
  if (rowError) throw rowError;
}
