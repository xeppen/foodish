import { UTApi } from "uploadthing/server";
import { type GeneratedImage } from "@/lib/image-generation/types";

function getFileExtension(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return "png";
}

type UploadThingResult = {
  _tag?: string;
  right?: { ufsUrl?: string; url?: string };
  left?: { message?: string };
  data?: { ufsUrl?: string; url?: string };
  error?: { message?: string };
};

function getUploadedFileUrl(result: UploadThingResult): string | null {
  if (result._tag === "Left") {
    throw new Error(result.left?.message ?? "UploadThing upload failed");
  }
  if (result._tag === "Right") {
    return result.right?.ufsUrl ?? result.right?.url ?? null;
  }
  if (result.error) {
    throw new Error(result.error.message ?? "UploadThing upload failed");
  }
  if (result.data) {
    return result.data.ufsUrl ?? result.data.url ?? null;
  }
  return null;
}

export async function uploadGeneratedDishImage(canonicalName: string, image: GeneratedImage): Promise<string> {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new Error("UPLOADTHING_TOKEN is not configured");
  }

  const ext = getFileExtension(image.mimeType);
  const safeName = canonicalName.replace(/\s+/g, "-").toLowerCase();
  const fileName = `dish-${safeName}-${Date.now()}.${ext}`;
  const fileBytes = new Uint8Array(image.data.byteLength);
  fileBytes.set(image.data);
  const file = new File([fileBytes], fileName, { type: image.mimeType });

  const utapi = new UTApi({ token });
  const result = (await utapi.uploadFiles(file, { contentDisposition: "inline" })) as unknown as UploadThingResult;
  const url = getUploadedFileUrl(result);
  if (!url) {
    throw new Error("UploadThing did not return a file URL");
  }
  return url;
}
