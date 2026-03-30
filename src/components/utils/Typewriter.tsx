"use client";
import { useState, useEffect } from "react";

interface TypewriterProps {
  words: string[];
  typingSpeed?: number; // in ms
  deleteSpeed?: number; // in ms
  pauseTime?: number; // time between typing and delete
}

export default function Typewriter({
  words,
  typingSpeed = 100,
  deleteSpeed = 50,
  pauseTime = 1000,
}: TypewriterProps) {
    const [text, setText] = useState<string>("");
    const [index, setIndex] = useState<number>(0);
    const [deleting, setDeleting] = useState<boolean>(false);

    useEffect(() => {
        const currentWord = words[index % words.length];
        
        let timer: NodeJS.Timeout;
        if (deleting) {
            timer = setTimeout(() => {
                setText(currentWord.slice(0, text.length - 1));
            }, deleteSpeed);
        } else {
            timer = setTimeout(() => {
                setText(currentWord.slice(0, text.length + 1));
            }, typingSpeed);
        }

        if (!deleting && text === currentWord) {
            timer = setTimeout(() => setDeleting(true), pauseTime);
        }

        else if (deleting && text === "") {
            setDeleting(false);
            setIndex((prev) => (prev + 1) % words.length);
        }

        return () => clearTimeout(timer);
    }, [text, deleting, words, index, typingSpeed, deleteSpeed, pauseTime]);

    return (
        <span className="typewriter">
            {text}
            <span className="cursor">|</span>
            <style>
                {`
                    .cursor {
                        display.inlineblock;
                        margin-left: 2px;
                        animation: blink 0.8s infinite;
                    }
                    
                    @keyframes blink {
                        0%, 50% { opacity: 1; }
                        50.01%, 100% { opacity: 0; }
                    }
                `}
            </style>
        </span>
    )
}
