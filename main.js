(() => {
  const canvas = document.getElementById("ambient-canvas");
  const motionToggle = document.getElementById("motion-toggle");
  const statusWhisper = document.getElementById("status-whisper");
  const navButtons = document.querySelectorAll(".nav-link[data-panel]");
  const emailLink = document.getElementById("email-link");
  const contactModal = document.getElementById("contact-modal");
  const contactClose = document.getElementById("contact-close");
  const contactForm = document.getElementById("contact-form");
  const contactFeedback = document.getElementById("contact-feedback");
  const contactSubmit = document.getElementById("contact-submit");

  // ---------------------------------------------------------------------------
  // 1. Live Dark Gradient Shader (Strictly 3 Premium Dark Colors)
  //    #050508 (Obsidian Void), #110E22 (Midnight Indigo), #2D254C (Twilight Violet)
  // ---------------------------------------------------------------------------
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let ambientEnabled = true;
  let targetIntensity = 1.0;
  let currentIntensity = 1.0;

  let targetMouseX = 0.5;
  let targetMouseY = 0.5;
  let mouseX = 0.5;
  let mouseY = 0.5;

  window.addEventListener(
    "pointermove",
    (e) => {
      targetMouseX = e.clientX / Math.max(window.innerWidth, 1);
      targetMouseY = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
    },
    { passive: true }
  );

  function initWebGLShader() {
    const gl =
      canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      }) ||
      canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      });

    if (!gl) return false;

    const vertexSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;
      varying vec2 vUv;

      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform vec2 uMouse;

      // Strictly 3 Dark Palette Colors
      const vec3 COLOR_VOID   = vec3(0.0196, 0.0196, 0.0314); // #050508
      const vec3 COLOR_INDIGO = vec3(0.0667, 0.0549, 0.1333); // #110E22
      const vec3 COLOR_VIOLET = vec3(0.1765, 0.1451, 0.2980); // #2D254C

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
        for (int i = 0; i < 4; i++) {
          v += amp * noise(p);
          p = rot * p * 2.02;
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 trueP = (uv - 0.5) * vec2(aspect, 1.0);
        vec2 p = (uv - 0.5) * vec2(max(aspect, 1.1), max(1.0, 0.85 / max(aspect, 0.35)));

        // Subtle pointer parallax
        vec2 pointerOffset = (uMouse - 0.5) * vec2(0.06, 0.04);
        p += pointerOffset;

        float t = uTime * 0.18;

        // Organic flowing S-curve wave matching the dark ribbon composition
        float waveCenter =
          -0.02
          + 0.21 * sin(p.x * 2.35 - 0.45 + t * 0.55)
          + 0.05 * cos(p.x * 3.40 + t * 0.35)
          + 0.04 * (fbm(vec2(p.x * 1.4 + t * 0.25, t * 0.15)) - 0.5);

        float distToWave = p.y - waveCenter;

        // Asymmetric crisp upper crest & soft atmospheric underglow
        float upperRidge = exp(-pow(max(distToWave, 0.0) * 11.0, 2.0)) *
                           smoothstep(-0.45, 0.75, p.x);
        float softBody = exp(-pow((distToWave + 0.04) * 4.6, 2.0));
        float lowerEcho = exp(-pow((distToWave + 0.16) * 3.2, 2.0)) *
                          smoothstep(0.60, -0.75, p.x);

        // Deep ambient indigo cloud behind center-right and lower-left
        float ambientField = fbm(p * 1.15 + vec2(t * 0.12, -t * 0.08));
        float deepGlow = smoothstep(0.25, 0.85, ambientField) *
                         (0.42 + 0.58 * smoothstep(-0.7, 0.6, p.x));

        // Compose strictly from the 3 dark colors
        vec3 col = COLOR_VOID;
        col = mix(col, COLOR_INDIGO, clamp(deepGlow * 0.62 + softBody * 0.56, 0.0, 1.0) * uIntensity);
        col = mix(col, COLOR_VIOLET, clamp((softBody * 0.40 + upperRidge * 0.65 + lowerEcho * 0.34), 0.0, 1.0) * uIntensity);

        // Subtle atmospheric highlight along the crest, staying inside the dark violet range
        float crestHighlight = exp(-abs(distToWave) * 28.0) *
                               (0.25 + 0.75 * smoothstep(-0.25, 0.75, p.x));
        col += COLOR_VIOLET * crestHighlight * 0.48 * uIntensity;

        // Crisp circular pinprick dust specks (aspect-true so dots stay round on mobile & desktop)
        vec2 starUv = trueP * 34.0;
        vec2 starId = floor(starUv);
        vec2 starLocal = fract(starUv) - 0.5;
        float starSeed = hash21(starId);
        if (starSeed > 0.986) {
          vec2 jitter = vec2(hash21(starId + 17.3), hash21(starId + 43.1)) - 0.5;
          float dStar = length(starLocal - jitter * 0.55);
          float starDot = smoothstep(0.065, 0.01, dStar);
          float starTwinkle = 0.45 + 0.55 * sin(uTime * 0.7 + starSeed * 62.0);
          col += COLOR_VIOLET * starDot * starTwinkle * 0.55 * uIntensity;
        }

        // Fine film grain to eliminate any 8-bit gradient banding
        float grain = (hash21(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.022;
        col += grain;

        // Keep corners deep void black
        float vignette = smoothstep(1.25, 0.25, length(p * vec2(0.72, 1.0)));
        col = mix(COLOR_VOID, col, 0.38 + 0.62 * vignette);

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return false;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uIntensity = gl.getUniformLocation(program, "uIntensity");
    const uMouse = gl.getUniformLocation(program, "uMouse");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener("resize", resize);

    let startTime = performance.now();
    let elapsedFrozen = 0;

    function render(now) {
      if (!prefersReducedMotion && ambientEnabled) {
        elapsedFrozen = (now - startTime) * 0.001;
      } else {
        startTime = now - elapsedFrozen * 1000;
      }

      currentIntensity += (targetIntensity - currentIntensity) * 0.05;
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsedFrozen);
      gl.uniform1f(uIntensity, currentIntensity);
      gl.uniform2f(uMouse, mouseX, mouseY);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    return true;
  }

  // Fallback Canvas 2D renderer if WebGL is unavailable
  function initCanvas2DFallback() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    let phase = 0;
    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      if (!prefersReducedMotion && ambientEnabled) phase += 0.004;
      currentIntensity += (targetIntensity - currentIntensity) * 0.05;

      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, w, h);

      const g1 = ctx.createRadialGradient(
        w * (0.25 + 0.03 * Math.sin(phase)),
        h * 0.65,
        0,
        w * 0.25,
        h * 0.65,
        w * 0.55
      );
      g1.addColorStop(0, `rgba(45, 37, 76, ${0.42 * currentIntensity})`);
      g1.addColorStop(0.5, `rgba(17, 14, 34, ${0.32 * currentIntensity})`);
      g1.addColorStop(1, "rgba(5, 5, 8, 0)");

      const g2 = ctx.createRadialGradient(
        w * (0.76 + 0.03 * Math.cos(phase)),
        h * 0.38,
        0,
        w * 0.76,
        h * 0.38,
        w * 0.5
      );
      g2.addColorStop(0, `rgba(45, 37, 76, ${0.48 * currentIntensity})`);
      g2.addColorStop(0.5, `rgba(17, 14, 34, ${0.34 * currentIntensity})`);
      g2.addColorStop(1, "rgba(5, 5, 8, 0)");

      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  if (!initWebGLShader()) {
    initCanvas2DFallback();
  }

  // ---------------------------------------------------------------------------
  // 2. Minimal Interactive Controls (Toggle + Subtle Nav Feedback)
  // ---------------------------------------------------------------------------
  let whisperTimer = null;

  function showWhisper(message, { italic = false, duration = 2800 } = {}) {
    if (!statusWhisper) return;
    statusWhisper.textContent = message;
    statusWhisper.classList.toggle("is-italic", italic);
    statusWhisper.classList.add("is-visible");
    window.clearTimeout(whisperTimer);
    whisperTimer = window.setTimeout(() => {
      statusWhisper.classList.remove("is-visible");
    }, duration);
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      ambientEnabled = !ambientEnabled;
      targetIntensity = ambientEnabled ? 1.0 : 0.35;
      motionToggle.classList.toggle("is-active", ambientEnabled);
      motionToggle.setAttribute("aria-checked", String(ambientEnabled));
      showWhisper(
        ambientEnabled ? "ambient gradient — active" : "ambient gradient — dimmed"
      );
    });
  }

  function openContactModal() {
    if (!contactModal) return;
    contactModal.hidden = false;
    if (contactFeedback) {
      contactFeedback.textContent = "";
      contactFeedback.classList.remove("is-error");
    }
    const firstInput = contactModal.querySelector('input[name="name"]');
    if (firstInput) firstInput.focus();
  }

  function closeContactModal() {
    if (!contactModal) return;
    contactModal.hidden = true;
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;
      if (panel === "contact") {
        openContactModal();
        return;
      }
      if (panel === "about") {
        showWhisper('"I simplify the way you work."', {
          italic: true,
          duration: 4200,
        });
        return;
      }
      showWhisper("currently in progress.");
    });
  });

  if (contactClose) {
    contactClose.addEventListener("click", closeContactModal);
  }

  if (contactModal) {
    contactModal.addEventListener("click", (e) => {
      if (e.target === contactModal) closeContactModal();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && contactModal && !contactModal.hidden) {
      closeContactModal();
    }
  });

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!contactSubmit || !contactFeedback) return;

      const formData = new FormData(contactForm);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        website: String(formData.get("website") || "").trim(),
      };

      contactSubmit.disabled = true;
      contactSubmit.textContent = "sending...";
      contactFeedback.textContent = "";
      contactFeedback.classList.remove("is-error");

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          contactFeedback.textContent =
            data.error || "Could not send message.";
          contactFeedback.classList.add("is-error");
        } else {
          contactForm.reset();
          closeContactModal();
          showWhisper(data.message || "message sent.");
        }
      } catch {
        contactFeedback.textContent =
          "Network error. Email suryaprakashb2006@gmail.com directly.";
        contactFeedback.classList.add("is-error");
      } finally {
        contactSubmit.disabled = false;
        contactSubmit.textContent = "send";
      }
    });
  }

  if (emailLink) {
    emailLink.addEventListener("click", () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("suryaprakashb2006@gmail.com").catch(() => {});
      }
      showWhisper("email — suryaprakashb2006@gmail.com");
    });
  }
})();
