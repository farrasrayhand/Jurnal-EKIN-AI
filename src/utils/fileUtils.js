// Utilitas Pemrosesan Berkas Bukti Kerja (Foto, Dokumen PDF/Office, dan Tautan Online)

export function processEvidenceFile(file) {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith("image/");
    const fileName = file.name;
    const fileSizeFormatted = formatBytes(file.size);
    const fileType = getFileTypeCategory(file.name, file.type);

    if (isImage) {
      // Kompresi gambar
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxWidth = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve({
            category: "image",
            type: fileType,
            name: fileName,
            size: fileSizeFormatted,
            dataUrl: compressedDataUrl
          });
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    } else {
      // Dokumen Non-Gambar (PDF, DOCX, XLSX, etc.)
      const reader = new FileReader();
      // Batasi ukuran dataUrl berkas dokumen maksimal 4MB agar browser tetap responsif
      if (file.size <= 4 * 1024 * 1024) {
        reader.readAsDataURL(file);
        reader.onload = () => {
          resolve({
            category: "document",
            type: fileType,
            name: fileName,
            size: fileSizeFormatted,
            dataUrl: reader.result
          });
        };
        reader.onerror = (err) => reject(err);
      } else {
        // Jika file terlalu besar (> 4MB), simpan metadata file saja
        resolve({
          category: "document",
          type: fileType,
          name: fileName,
          size: fileSizeFormatted,
          dataUrl: null
        });
      }
    }
  });
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileTypeCategory(fileName = "", mimeType = "") {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf" || mimeType.includes("pdf")) return "pdf";
  if (["doc", "docx"].includes(ext) || mimeType.includes("word")) return "word";
  if (["xls", "xlsx", "csv"].includes(ext) || mimeType.includes("sheet") || mimeType.includes("excel")) return "excel";
  if (["ppt", "pptx"].includes(ext) || mimeType.includes("presentation")) return "powerpoint";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  return "file";
}
