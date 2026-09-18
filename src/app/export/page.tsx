import { redirect } from "next/navigation";

// Ruta legacy: /export ahora vive en /settings (Configuración).
export default function ExportPage() {
  redirect("/settings");
}
