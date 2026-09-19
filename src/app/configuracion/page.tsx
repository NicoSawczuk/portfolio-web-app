import { redirect } from "next/navigation";

// Ruta legacy en español: el hub de Configuración ahora vive en /settings.
export default function ConfiguracionPage() {
  redirect("/settings");
}
