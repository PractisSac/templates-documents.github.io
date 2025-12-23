window.addEventListener('DOMContentLoaded', async () => {
  // === Helpers ===
  const qs = new URLSearchParams(location.search);
  const get = (k) => (qs.has(k) ? qs.get(k).trim() : "");
  const setText = (id, val) => {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Permite que “horas” funcione aunque el HTML use variantes de id (id-hours, id-hours-xx)
  const setHoras = (val) => {
    if (!val) return;
    let el = document.getElementById("id-hours");
    if (!el) {
      el = Array.from(document.querySelectorAll("[id^='id-hours']"))
        .find((n) => /\d/.test(n.textContent || ""));
    }
    if (el) el.textContent = val;
  };

  // Acepta "YYYY-MM-DD", "DD/MM/YYYY" (y también "YYYY/MM/DD") y fija TZ Lima
  const parseDateAny = (str) => {
    if (!str) return null;
    // YYYY-MM-DD o YYYY/MM/DD
    let m = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00-05:00`);
    // DD/MM/YYYY
    m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00-05:00`);
    return null;
  };

  const mesLargo = (d) => d.toLocaleString("es-PE", { month: "long", timeZone: "America/Lima" });
  const dia2 = (d) => d.toLocaleString("es-PE", { day: "2-digit", timeZone: "America/Lima" });
  const fechaLarga = (d) => `${dia2(d)} de ${mesLargo(d)} del ${d.getFullYear()}`;

  // Rango “humano” (10 de octubre al 15 de octubre del 2025, etc.)
  const rangoFechas = (d1, d2) => {
    if (!d1 || !d2 || isNaN(d1) || isNaN(d2)) return "";
    const y1 = d1.getFullYear(), y2 = d2.getFullYear();
    const m1 = mesLargo(d1), m2 = mesLargo(d2);
    const dd1 = dia2(d1), dd2 = dia2(d2);

    if (y1 === y2) {
      if (m1 === m2) {
        // mismo mes y año
        return `${dd1} de ${m1} al ${dd2} de ${m2} del ${y2}`;
      }
      // meses distintos, mismo año
      return `${dd1} de ${m1} al ${dd2} de ${m2} del ${y2}`;
    }
    // años distintos
    return `${dd1} de ${m1} del ${y1} al ${dd2} de ${m2} del ${y2}`;
  };

  // === Lee parámetros ===
  const nombre = get("nombre");
  const tipoDoc = get("tipo_doc");
  const numDoc = get("num_doc");
  const horas = get("horas");
  const codigo = get("codigo");

  // Este template recibe normalmente UNA sola fecha:
  // soportamos "fecha" (principal) y por compatibilidad "fecha_fin"/"fecha_inicio"
  const fUnica = parseDateAny(get("fecha"));
  const fInicio = parseDateAny(get("fecha_inicio"));
  const fFin = parseDateAny(get("fecha_fin"));

  // === Pinta campos (solo si hay dato) ===
  setText("id-nombre-completo", nombre);
  setText("id-type-document", tipoDoc);
  setText("id-num-document", numDoc);
  setHoras(horas); // número de horas

  // Lógica de fechas:
  // 1) Si viene "fecha" (única), úsala para la fecha principal.
  // 2) Si además vienen inicio/fin, pinta el rango “humano”.
  // 3) Si no viene "fecha" pero sí fin, usa fin como fecha principal.
  if (fUnica) {
    setText("id-date", fechaLarga(fUnica));
  } else if (fFin) {
    setText("id-date", fechaLarga(fFin));
  }

  // Si llegan las dos para rango, lo mostramos
  if (fInicio && fFin) {
    setText("id-date-start-end", rangoFechas(fInicio, fFin));
  } else if (fUnica && !fInicio && !fFin) {
    // Si solo hay una fecha y quieres mostrar algo en el rango,
    // puedes descomentar la siguiente línea:
    // setText("id-date-start-end", fechaLarga(fUnica));
  }

  // === QR dinámico (con timeout y fallback) ===
  if (codigo) {
    const targetUrl = `https://bd.practissac.com/student/${encodeURIComponent(codigo)}`;

    // Texto/enlace bajo el QR
    const qrLink = document.getElementById("qr-text-id-2-2");
    if (qrLink) {
      qrLink.href = targetUrl;
      qrLink.textContent = `${codigo}`;
      qrLink.rel = "noopener noreferrer";
      qrLink.target = "_blank";
    }

    const qrBox = document.getElementById("id-qr-code"); // contenedor con background-image
    const setQRBg = (url) => {
      if (!qrBox) return;
      qrBox.style.backgroundImage = `url('${url}')`;
      qrBox.style.backgroundSize = "cover";
      qrBox.style.backgroundPosition = "center";
    };

    const URL_BASE = 'https://nred.practis.pe';
    const qrEndpoint = `${URL_BASE}/tools/qr-generator`;

    try {
      const payload = {
        url: targetUrl,
        qrLogo: 'https://nred.practis.pe/media-puplic/image/svg/logo.png',
        qrLogoW: 30,
        qrLogoH: 40
      };

      // Timeout de 5s para no colgar la carga si el servicio QR está lento
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5000);

      const resp = await fetch(qrEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      clearTimeout(to);

      if (!resp.ok) throw new Error(`QR API status ${resp.status}`);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      setQRBg(objUrl);
    } catch (e) {
      console.warn("Fallo QR Node-RED, usando fallback HTTPS sin logo:", e);
      // Fallback (sin logo)
      const fallback = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(targetUrl)}&size=125x125`;
      setQRBg(fallback);
    }
  }
});
