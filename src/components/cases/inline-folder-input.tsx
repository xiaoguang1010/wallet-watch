'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineFolderInputProps {
    depth?: number;
    onSave: (name: string) => void;
    onCancel: () => void;
    placeholder?: string;
}

export function InlineFolderInput({ depth = 0, onSave, onCancel, placeholder = "输入文件夹名称..." }: InlineFolderInputProps) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto focus on mount
        inputRef.current?.focus();
    }, []);

    const handleSave = () => {
        if (value.trim()) {
            onSave(value.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
            {/* Spacing for alignment */}
            <div className="w-4 h-4 shrink-0" />
            <div className="w-4 h-4 shrink-0" />

            {/* Input */}
            <Input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-7 text-sm flex-1"
                autoFocus
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={handleSave}
                    disabled={!value.trim()}
                >
                    <Check className="w-3 h-3 text-green-600" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={onCancel}
                >
                    <X className="w-3 h-3 text-red-600" />
                </Button>
            </div>
        </div>
    );
}

