import { COLORS } from '../theme'

export function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');

      * { margin:0; padding:0; box-sizing:border-box; }
      html, body, #root { height:100%; background:${COLORS.bg}; color:${COLORS.text}; }
      body { font-family: 'DM Sans', 'Noto Sans SC', sans-serif; -webkit-font-smoothing:antialiased; }

      ::-webkit-scrollbar { width:6px; height:6px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:${COLORS.border}; border-radius:3px; }
      ::-webkit-scrollbar-thumb:hover { background:${COLORS.borderLight}; }

      input, textarea, select {
        font-family:inherit; color:${COLORS.text};
        background:${COLORS.surface}; border:1px solid ${COLORS.border};
        border-radius:8px; padding:10px 14px; font-size:14px;
        outline:none; transition:border-color 0.2s;
      }
      input:focus, textarea:focus { border-color:${COLORS.accent}; }
      input::placeholder, textarea::placeholder { color:${COLORS.textMuted}; }

      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      @keyframes gradientShift {
        0% { background-position:0% 50%; }
        50% { background-position:100% 50%; }
        100% { background-position:0% 50%; }
      }
    `}</style>
  )
}
