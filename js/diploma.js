
window.addEventListener('DOMContentLoaded', async () => {
  // === Helpers ===
  const qs = new URLSearchParams(location.search);
  const get = (k) => (qs.has(k) ? qs.get(k).trim() : "");
  const setText = (id, val) => {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Busca el nodo de horas aunque el HTML use variantes de id (id-hours, id-hours-xx)
  const setHoras = (val) => {
    if (!val) return;
    let el = document.getElementById("id-hours");
    if (!el) {
      el = Array.from(document.querySelectorAll("[id^='id-hours']"))
        .find((n) => /\d/.test(n.textContent || ""));
    }
    if (el) el.textContent = val;
  };

  // Acepta "YYYY-MM-DD" o "DD/MM/YYYY" y fija TZ Lima
  const parseDateAny = (str) => {
    if (!str) return null;
    let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00-05:00`);
    m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00-05:00`);
    return null;
  };

  const mesLargo = (d) => d.toLocaleString("es-PE", { month: "long", timeZone: "America/Lima" });
  const dia2 = (d) => d.toLocaleString("es-PE", { day: "2-digit", timeZone: "America/Lima" });
  const fechaLarga = (d) => `${dia2(d)} de ${mesLargo(d)} del ${d.getFullYear()}`;

  // Reglas de rango con gramática “humana”
  const rangoFechas = (d1, d2) => {
    if (!d1 || !d2 || isNaN(d1) || isNaN(d2)) return "";
    const y1 = d1.getFullYear(), y2 = d2.getFullYear();
    const m1 = mesLargo(d1), m2 = mesLargo(d2);
    const dd1 = dia2(d1), dd2 = dia2(d2);

    if (y1 === y2 && m1 === m2) {
      // mismo mes y año
      return `${dd1} de ${m1} al ${dd2} de ${m2} del ${y2}`;
    }
    if (y1 === y2) {
      // meses distintos, mismo año
      return `${dd1} de ${m1} al ${dd2} de ${m2} del ${y2}`;
    }
    // años distintos
    return `${dd1} de ${m1} del ${y1} al ${dd2} de ${m2} del ${y2}`;
  };

  // === Lee parámetros ===
  const nombre     = get("nombre");
  const tipoDoc    = get("tipo_doc");
  const numDoc     = get("num_doc");
  const horas      = get("horas");
  const codigo     = get("codigo");
  const fInicio    = parseDateAny(get("fecha_inicio"));
  const fFin       = parseDateAny(get("fecha_fin"));

  // === Pinta campos (solo si hay dato) ===
  setText("id-nombre-completo", nombre);            // :contentReference[oaicite:0]{index=0}
  setText("id-type-document",  tipoDoc);            // :contentReference[oaicite:1]{index=1}
  setText("id-num-document",   numDoc);             // :contentReference[oaicite:2]{index=2}
  setHoras(horas);              // número de horas dentro del bloque :contentReference[oaicite:3]{index=3}

  if (fInicio && fFin) {
    setText("id-date-start-end", rangoFechas(fInicio, fFin)); // :contentReference[oaicite:4]{index=4}
  }
  if (fFin) {
    setText("id-date", fechaLarga(fFin)); // la fecha aparte usa fecha_fin :contentReference[oaicite:5]{index=5}
  }

  // === QR dinámico ===
  if (codigo) {
    const targetUrl = `https://bd.practissac.com/student/${encodeURIComponent(codigo)}`;

    // Texto/enlace bajo el QR
    const qrLink = document.getElementById("qr-text-id-2-2"); // :contentReference[oaicite:6]{index=6}
    if (qrLink) {
      qrLink.href = targetUrl;
      qrLink.textContent = `${codigo}`;
    }

    const qrBox = document.getElementById("id-qr-code"); // contenedor con background-image :contentReference[oaicite:7]{index=7}
    const setQRBg = (url) => {
      if (!qrBox) return;
      qrBox.style.backgroundImage = `url('${url}')`;
      qrBox.style.backgroundSize = "cover";
      qrBox.style.backgroundPosition = "center";
    };

    URL_BASE = 'https://nred.practis.pe'
    // Intenta Node-RED (HTTPS si la página es HTTPS; si no, usa HTTP)
    const qrEndpoint = URL_BASE + '/tools/qr-generator';

    try {
      const payload = {
        url: targetUrl,
        qrLogo: 'https://nred.practis.pe/media-puplic/image/svg/logo.png',
        qrLogoW: 30, // ancho
        qrLogoH: 40  // alto
      };

      const resp = await fetch(qrEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error(`QR API status ${resp.status}`);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      setQRBg(objUrl);
    } catch (e) {
      console.warn("Fallo QR Node-RED, usando fallback HTTPS sin logo:", e);
      // Fallback HTTPS (sin logo) para evitar mixed content/CORS
      const fallback = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(targetUrl)}&size=125x125`;
      setQRBg(fallback);
    }
  }
});
