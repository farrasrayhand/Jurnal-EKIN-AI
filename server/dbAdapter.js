import { 
  getMysqlConfig, 
  initMysqlDatabase, 
  loadStoreFromMysql, 
  syncStoreToMysql, 
  getDatabaseHealth as getMysqlHealth 
} from "./mysqlAdapter.js";
import { 
  getPostgresConfig, 
  initPostgresDatabase, 
  loadStoreFromPostgres, 
  syncStoreToPostgres, 
  getPostgresHealth 
} from "./postgresAdapter.js";

/**
 * Mendapatkan tipe database yang aktif berdasarkan environment variable
 */
export function getActiveDbType() {
  const dbType = (process.env.DB_TYPE || process.env.VITE_DB_TYPE || "").toLowerCase();
  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || "";

  if (dbType === "postgres" || dbType === "postgresql" || dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    return "postgres";
  }

  if (dbType === "mysql" || dbType === "mariadb" || dbUrl.startsWith("mysql://") || dbUrl.startsWith("mysql2://")) {
    return "mysql";
  }

  // Jika ada host postgres
  if (process.env.DB_PORT === "5432" || process.env.VITE_DB_PORT === "5432") {
    return "postgres";
  }

  // Jika ada host mysql
  if (process.env.DB_PORT === "3306" || process.env.VITE_DB_PORT === "3306") {
    return "mysql";
  }

  return "json";
}

/**
 * Inisialisasi Database (MySQL / PostgreSQL / Fallback JSON)
 */
export async function initDatabase() {
  const activeType = getActiveDbType();

  if (activeType === "postgres") {
    return await initPostgresDatabase();
  }

  if (activeType === "mysql") {
    return await initMysqlDatabase();
  }

  return { enabled: false, reason: "Menggunakan database lokal JSON ekinerja_store.json." };
}

/**
 * Mengambil store dari Database aktif
 */
export async function loadStoreFromDatabase() {
  const activeType = getActiveDbType();

  if (activeType === "postgres") {
    return await loadStoreFromPostgres();
  }

  if (activeType === "mysql") {
    return await loadStoreFromMysql();
  }

  return null;
}

/**
 * Menyimpan / Sinkronisasi store ke Database aktif
 */
export async function syncStoreToDatabase(store) {
  const activeType = getActiveDbType();

  if (activeType === "postgres") {
    return await syncStoreToPostgres(store);
  }

  if (activeType === "mysql") {
    return await syncStoreToMysql(store);
  }
}

/**
 * Mengambil status kesehatan database aktif (untuk /api/system/db-status)
 */
export async function getDatabaseHealth() {
  const activeType = getActiveDbType();

  if (activeType === "postgres") {
    return await getPostgresHealth();
  }

  if (activeType === "mysql") {
    return await getMysqlHealth();
  }

  return {
    type: "json",
    label: "JSON Store (Local File)",
    connected: false,
    configured: false,
    message: "Menggunakan file lokal database/ekinerja_store.json (MySQL & PostgreSQL tidak aktif)."
  };
}
