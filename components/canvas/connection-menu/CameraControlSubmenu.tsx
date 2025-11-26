import React from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, ArrowRight, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { ReshootMotionType } from '@/lib/types';

type CameraControlSubmenuProps = {
    type: 'control' | 'position';
    onBack: () => void;
    onSelect: (type: ReshootMotionType) => void;
};

export default function CameraControlSubmenu({ type, onBack, onSelect }: CameraControlSubmenuProps) {
    const controlItems: { label: string; value: ReshootMotionType; icon: React.ElementType }[] = [
        { label: '上移', value: 'RESHOOT_MOTION_TYPE_UP', icon: ArrowUp },
        { label: '下移', value: 'RESHOOT_MOTION_TYPE_DOWN', icon: ArrowDown },
        { label: '右移', value: 'RESHOOT_MOTION_TYPE_LEFT_TO_RIGHT', icon: ArrowRight },
        { label: '左移', value: 'RESHOOT_MOTION_TYPE_RIGHT_TO_LEFT', icon: ArrowLeft },
        { label: '推近', value: 'RESHOOT_MOTION_TYPE_FORWARD', icon: ZoomIn },
        { label: '拉远', value: 'RESHOOT_MOTION_TYPE_BACKWARD', icon: ZoomOut },
        { label: '希区柯克', value: 'RESHOOT_MOTION_TYPE_DOLLY_IN_ZOOM_OUT', icon: Move },
    ];

    const positionItems: { label: string; value: ReshootMotionType; icon: React.ElementType }[] = [
        { label: '固定-上', value: 'RESHOOT_MOTION_TYPE_STATIONARY_UP', icon: ArrowUp },
        { label: '固定-下', value: 'RESHOOT_MOTION_TYPE_STATIONARY_DOWN', icon: ArrowDown },
        { label: '固定-左', value: 'RESHOOT_MOTION_TYPE_STATIONARY_LEFT_LARGE', icon: ArrowLeft },
        { label: '固定-右', value: 'RESHOOT_MOTION_TYPE_STATIONARY_RIGHT_LARGE', icon: ArrowRight },
    ];

    const items = type === 'control' ? controlItems : positionItems;
    const title = type === 'control' ? '镜头控制' : '镜头位置';

    return (
        <div className="w-[200px]">
            <div className="px-3 py-2 flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</span>
            </div>

            <div className="px-1.5 pb-1.5 grid grid-cols-4 gap-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.value}
                            onClick={() => onSelect(item.value)}
                            className="py-2 flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-all"
                            title={item.label}
                        >
                            <Icon size={16} strokeWidth={2} />
                            <span className="text-[8px] font-medium truncate w-full text-center">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
