// RELAIS SMS — à coller dans Cloudflare Workers (voir guide fourni)
// Ce petit programme sert de pont entre gestion-sms.html et InfiniReach / Brevo / SMS Gateway Cloud,
// pour contourner le blocage de sécurité CORS des navigateurs.

const CIBLES = {
  infinireach: "https://api.infinireach.io",
  brevo: "https://api.brevo.com",
  smsgate: "https://api.sms-gate.app",
};

function entetesCORS() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: entetesCORS() });
    }

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean); // ex: ["proxy","infinireach","api","v1","messages"]

    if (segments[0] !== "proxy" || !CIBLES[segments[1]]) {
      return new Response("Relais SMS actif. Utilisez /proxy/infinireach/... , /proxy/brevo/... ou /proxy/smsgate/...", {
        status: 200,
        headers: entetesCORS(),
      });
    }

    const base = CIBLES[segments[1]];
    const cheminRestant = segments.slice(2).join("/");
    const urlCible = base + "/" + cheminRestant + url.search;

    const entetesEnvoyes = new Headers(request.headers);
    entetesEnvoyes.delete("host");
    entetesEnvoyes.delete("origin");
    entetesEnvoyes.delete("referer");

    const options = {
      method: request.method,
      headers: entetesEnvoyes,
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      options.body = await request.text();
    }

    try {
      const reponse = await fetch(urlCible, options);
      const entetesReponse = new Headers(reponse.headers);
      const cors = entetesCORS();
      Object.keys(cors).forEach((k) => entetesReponse.set(k, cors[k]));
      return new Response(reponse.body, { status: reponse.status, headers: entetesReponse });
    } catch (e) {
      return new Response(JSON.stringify({ erreur: "Le relais n'a pas pu joindre " + base }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...entetesCORS() },
      });
    }
  },
};
