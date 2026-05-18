import { api } from "./api";
export type ShareWithMe = {
 id: string;
 nodeId: string;
 nodeType: "file" | "folder";
 name: string;
 createdAt: string;
 fromUser?: {
   email?: string;
 };
};
export type PublicSharePayload = {
 nodeId: string;
 expiresAt?: string;
 password?: string;
};
export type InternalSharePayload = {
 nodeId: string;
 nodeType: "file" | "folder";
 toEmail: string;
};
function pickError(data: any, fallback: string) {
 const error = data?.error || data?.message;
 if (error === "SHARE_EXPIRED") {
   return "Ce lien de partage a expiré.";
 }
 if (error === "INVALID_PASSWORD") {
   return "Le mot de passe est incorrect.";
 }
 if (error === "PASSWORD_REQUIRED") {
   return "Un mot de passe est requis pour accéder à ce fichier.";
 }
 if (error === "EXPIRES_AT_MUST_BE_FUTURE") {
   return "La date d'expiration doit être dans le futur.";
 }
 if (error === "INVALID_EXPIRES_AT") {
   return "La date d'expiration est invalide.";
 }
 if (error === "TARGET_USER_NOT_FOUND") {
   return "Aucun utilisateur trouvé avec cet email.";
 }
 if (error === "ITEM_NOT_FOUND") {
   return "Élément introuvable ou non autorisé.";
 }
 return error || fallback;
}
export async function createPublicShare(payload: PublicSharePayload) {
 try {
   const res = await api.post("/shares/public", payload);
   return res.data.share;
 } catch (e: any) {
   throw new Error(
     pickError(e?.response?.data, "Création du lien public impossible.")
   );
 }
}
export async function createInternalShare(payload: InternalSharePayload) {
 try {
   const res = await api.post("/shares/internal", payload);
   return res.data.share;
 } catch (e: any) {
   throw new Error(
     pickError(e?.response?.data, "Partage interne impossible.")
   );
 }
}
export async function getSharesWithMe(): Promise<ShareWithMe[]> {
 try {
   const res = await api.get("/shares/with-me");
   return Array.isArray(res.data?.items) ? res.data.items : [];
 } catch (e: any) {
   throw new Error(
     pickError(e?.response?.data, "Impossible de charger les partages.")
   );
 }
}
export function getInternalShareFileUrl(
 shareId: string,
 disposition: "inline" | "attachment" = "attachment"
) {
 return `${api.defaults.baseURL}/shares/internal/${shareId}/file?disposition=${disposition}`;
}
export async function getPublicShareMeta(token: string) {
 try {
   const res = await api.get(`/shares/public/${token}`);
   return res.data;
 } catch (e: any) {
   throw new Error(
     pickError(e?.response?.data, "Lien public introuvable.")
   );
 }
}
export async function accessPublicShare(token: string, password?: string) {
 try {
   const res = await api.post(`/shares/public/${token}/access`, {
     password,
   });
   const data = res.data || {};
   return {
     ...data,
     previewUrl: data.previewUrl
       ? `${api.defaults.baseURL}${data.previewUrl}`
       : null,
     downloadUrl: data.downloadUrl
       ? `${api.defaults.baseURL}${data.downloadUrl}`
       : null,
   };
 } catch (e: any) {
   throw new Error(
     pickError(e?.response?.data, "Accès au lien public impossible.")
   );
 }
}