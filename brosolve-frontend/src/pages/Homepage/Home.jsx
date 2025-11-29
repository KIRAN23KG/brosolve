import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();

  // Auto redirect after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const audio = new Audio("/sounds/bro_smile_intro.m4a");
    audio.volume = 0.5;
    audio.muted = true;   // muted autoplay
    audio.loop = false;   // only once
    audio.preload = "auto";
    audio.play().catch(() => {});  // muted autoplay always allowed

    const unmuteOnClick = () => {
      audio.muted = false;
      audio.currentTime = 0; // restart
      audio.play();
      window.removeEventListener("click", unmuteOnClick);
    };
    window.addEventListener("click", unmuteOnClick);

    // Cleanup
    return () => {
      window.removeEventListener("click", unmuteOnClick);
      audio.pause();
      audio.src = '';
    };
  }, []);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 2.5,
          ease: "easeInOut"
        }}
        className="intro-wrapper blur-[10px] animate-unblur"
      >
        <div className="relative">
          <motion.h1
            initial={{ 
              opacity: 0,
              y: 40,
              scale: 0.85,
              filter: "brightness(0.2) blur(2px)"
            }}
            animate={{ 
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "brightness(1) blur(0px)"
            }}
            transition={{
              duration: 2.2,
              delay: 0.8,
              ease: "easeOut"
            }}
            className="text-white font-extrabold text-[30vw] leading-none select-none text-center drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]"
          >
            <span className="tracking-tight">BRO</span>
            <span className="font-light text-[0.4em] align-top ml-4">solve</span>
          </motion.h1>
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "150%" }}
            transition={{ duration: 1.2, delay: 1.6, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            style={{ mixBlendMode: "screen" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
