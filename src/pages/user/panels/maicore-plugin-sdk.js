/*
 * Maicore Plugin SDK — the UNTRUSTED side, imported by a plugin inside the
 * sandboxed iframe. It can ONLY talk to the host via postMessage. It has no
 * token, no direct network, no access to the parent DOM. Every API call is a
 * request the HOST decides to fulfil (after scope + server Gate checks).
 *
 * Usage inside a plugin's index.html:
 *
 *   <script src="maicore-plugin-sdk.js"></script>
 *   <script>
 *     maicore.ready().then(async (ctx) => {
 *       // ctx = { containerId, scopes, appSlug }
 *       const offerings = await maicore.get('/inventory/containers/_/offerings');
 *       render(offerings.data);
 *     });
 *   </script>
 *
 * Note: use '_' as the container segment — the host REPLACES it with the real
 * container the plugin is installed in. A plugin cannot target another container.
 */
(function () {
  const pending = new Map();
  let reqCounter = 0;
  let initCtx = null;
  let initResolve;
  const initPromise = new Promise((res) => {
    initResolve = res;
  });

  function post(msg) {
    parent.postMessage(Object.assign({ __maicore: true }, msg), "*");
  }

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || msg.__maicore !== true) return;

    if (msg.type === "init") {
      initCtx = {
        containerId: msg.containerId,
        scopes: msg.scopes || [],
        appSlug: msg.appSlug,
      };
      initResolve(initCtx);
      return;
    }

    if (msg.type === "response" && pending.has(msg.reqId)) {
      const { resolve, reject } = pending.get(msg.reqId);
      pending.delete(msg.reqId);
      if (msg.ok) resolve({ status: msg.status, data: msg.data });
      else
        reject(
          Object.assign(new Error(msg.error || "request_failed"), {
            status: msg.status,
            detail: msg.detail,
          }),
        );
    }
  });

  function request(method, path, body) {
    return new Promise((resolve, reject) => {
      const reqId = "r" + ++reqCounter;
      pending.set(reqId, { resolve, reject });
      post({ type: "request", reqId, method, path, body });
      setTimeout(() => {
        if (pending.has(reqId)) {
          pending.delete(reqId);
          reject(new Error("timeout"));
        }
      }, 15000);
    });
  }

  window.maicore = {
    // Resolves once the host has sent context (scopes + container).
    ready() {
      post({ type: "ready" });
      return initPromise;
    },
    context() {
      return initCtx;
    },
    get(path) {
      return request("GET", path);
    },
    post(path, body) {
      return request("POST", path, body);
    },
    patch(path, body) {
      return request("PATCH", path, body);
    },
    del(path) {
      return request("DELETE", path);
    },
  };
})();
