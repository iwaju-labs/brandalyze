"use client"

import { motion } from 'framer-motion'
import { ReactNode } from 'react';

interface MotionFadeProps {
    readonly children: ReactNode;
    readonly delay?: number;
    readonly duration?: number;
    readonly amount?: number; // when to trigger (0 - 1)
    readonly once?: boolean; // animate only the first time
    readonly className?: string;
}

export default function MotionFadeUp({
    children,
    delay = 0,
    duration = 0.4,
    amount = 0.5,
    once = true,
    className = "",
}: MotionFadeProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount, once }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
            style={{ transform: 'translateZ(0)' }}
        >
            {children}
        </motion.div>
    )
}