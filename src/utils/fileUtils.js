// Utilitas Pemrosesan Berkas Bukti Kerja (Foto, Dokumen PDF/Office, dan Tautan Online)

export function processEvidenceFile(file) {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith("image/");
    const fileName = file.name;
    const fileSizeFormatted = formatBytes(file.size);
    const fileType = getFileTypeCategory(file.name, file.type);

    if (isImage) {
      // Kompresi gambar cerdas ala WhatsApp:
      // 1. Batasi dimensi maksimal (sisi terpanjang max 1280px)
      // 2. Pertahankan proporsi aspek rasio (baik landscape maupun portrait)
      // 3. Konversi format ke JPEG kualitas 0.75 (sangat tajam untuk teks/wajah namun berukuran sangat hemat ~80-180 KB)
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxDimension = 1280; // Standar kompresi optimal WhatsApp & dokumen ASN
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Kompresi ke JPEG dengan kualitas 0.75
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);

          // Hitung ukuran nyata setelah kompresi
          const head = "data:image/jpeg;base64,";
          const compressedBytes = Math.round((compressedDataUrl.length - head.length) * 3 / 4);
          const finalSizeFormatted = formatBytes(compressedBytes);

          resolve({
            category: "image",
            type: fileType,
            name: fileName.replace(/\.[^/.]+$/, "") + ".jpg",
            originalSize: fileSizeFormatted,
            size: finalSizeFormatted,
            compressed: true,
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
