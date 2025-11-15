"use client"

import { motion } from 'framer-motion'
import { ReactNode } from 'react';

interface MotionFadeProps {
    readonly children: ReactNode;
    readonly delay?: number;
    readonly duration?: number;
    readonly className?: string;
}

export default function MotionFadeUp({
    children,
    delay = 0,
    duration = 0.4,
    className = "",
}: MotionFadeProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1}}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    )
}