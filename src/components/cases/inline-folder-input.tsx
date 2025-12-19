'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineFolderInputProps {
    depth: number;
    onSave: (name: string) => void;
    onCancel: () => void;
    placeholder?: string;
}

export function InlineFolderInput({ depth, onSave, onCancel, placeholder = "输入名称..." }: InlineFolderInputProps) {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto focus on mount
        inputRef.current?.focus();
    }, []);

    const handleSave = () => {
        const trimmedName = name.trim();
        if (trimmedName) {
            onSave(trimmedName);
            setName('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 bg-muted/50 border border-dashed border-primary/50"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
            {/* Spacing for icon alignment */}
            <div className="w-4 h-4 shrink-0" />
            <div className="w-4 h-4 shrink-0" />

            {/* Input */}
            <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-7 text-sm flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />

            {/* Actions */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={handleSave}
                    disabled={!name.trim()}
                >
                    <Check className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={onCancel}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

