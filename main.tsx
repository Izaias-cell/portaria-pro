@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

body {
  @apply antialiased text-slate-900 bg-slate-50;
  -webkit-tap-highlight-color: transparent;
}

/* Custom scrollbar for a cleaner look */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-transparent;
}

::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full hover:bg-slate-300 transition-colors;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

@keyframes blink-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.9); }
}

@keyframes pulse-strong {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  50% { transform: scale(1.03); box-shadow: 0 0 20px 15px rgba(220, 38, 38, 0); }
}

@keyframes pulse-orange {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 15px 8px rgba(249, 115, 22, 0); }
}

@keyframes pulse-green {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 15px 8px rgba(16, 185, 129, 0); }
}

@keyframes pulse-blue {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 15px 8px rgba(37, 99, 235, 0); }
}

.animate-blink-soft {
  animation: blink-soft 1.5s ease-in-out infinite;
}

.pulse-strong {
  animation: pulse-strong 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.pulse-orange {
  animation: pulse-orange 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.pulse-green {
  animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.pulse-blue {
  animation: pulse-blue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-petroleum {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(19, 61, 71, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 15px 8px rgba(19, 61, 71, 0); }
}

.pulse-petroleum {
  animation: pulse-petroleum 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-white {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5); }
  50% { transform: scale(1.03); box-shadow: 0 0 15px 10px rgba(255, 255, 255, 0); }
}

.pulse-white {
  animation: pulse-white 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-amber {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 15px 8px rgba(245, 158, 11, 0); }
}

.pulse-amber {
  animation: pulse-amber 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes progress {
  0% { width: 0%; }
  100% { width: 100%; }
}

.animate-progress {
  animation: progress 2s ease-in-out forwards;
}
