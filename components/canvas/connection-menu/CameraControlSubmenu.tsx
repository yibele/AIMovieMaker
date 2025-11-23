
import React from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, ArrowRight, ZoomIn, ZoomOut, Video, Move } from 'lucide-react';
import { ReshootMotionType } from '@/lib/types';

type CameraControlSubmenuProps = {
    type: 'control' | 'position';
    onBack: () => void;
    onSelect: (type: ReshootMotionType) => void;
};

export default function CameraControlSubmenu({ type, onBack, onSelect }: CameraControlSubmenuProps) {
    const controlItems: { label: string; value: ReshootMotionType; icon: React.ReactNode }[] = [
        { label: '向上平移 (Up)', value: 'RESHOOT_MOTION_TYPE_UP', icon: <ArrowUp size={16} /> },
        { label: '向下平移 (Down)', value: 'RESHOOT_MOTION_TYPE_DOWN', icon: <ArrowDown size={16} /> },
        { label: '从左向右 (Pan Right)', value: 'RESHOOT_MOTION_TYPE_LEFT_TO_RIGHT', icon: <ArrowRight size={16} /> },
        { label: '从右向左 (Pan Left)', value: 'RESHOOT_MOTION_TYPE_RIGHT_TO_LEFT', icon: <ArrowLeft size={16} /> },
        { label: '向前推进 (Zoom In)', value: 'RESHOOT_MOTION_TYPE_FORWARD', icon: <ZoomIn size={16} /> },
        { label: '向后拉远 (Zoom Out)', value: 'RESHOOT_MOTION_TYPE_BACKWARD', icon: <ZoomOut size={16} /> },
        { label: '推近拉远 (Dolly Zoom)', value: 'RESHOOT_MOTION_TYPE_DOLLY_IN_ZOOM_OUT', icon: <Move size={16} /> },
        { label: '拉远推近 (Reverse Dolly)', value: 'RESHOOT_MOTION_TYPE_DOLLY_OUT_ZOOM_IN_LARGE', icon: <Move size={16} /> },
    ];

    const positionItems: { label: string; value: ReshootMotionType; icon: React.ReactNode }[] = [
        { label: '固定机位-向上', value: 'RESHOOT_MOTION_TYPE_STATIONARY_UP', icon: <ArrowUp size={16} /> },
        { label: '固定机位-向下', value: 'RESHOOT_MOTION_TYPE_STATIONARY_DOWN', icon: <ArrowDown size={16} /> },
        { label: '固定机位-向左', value: 'RESHOOT_MOTION_TYPE_STATIONARY_LEFT_LARGE', icon: <ArrowLeft size={16} /> },
        { label: '固定机位-向右', value: 'RESHOOT_MOTION_TYPE_STATIONARY_RIGHT_LARGE', icon: <ArrowRight size={16} /> },
        { label: '固定机位-推近拉远', value: 'RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_IN_ZOOM_OUT', icon: <Move size={16} /> },
        { label: '固定机位-拉远推近', value: 'RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_OUT_ZOOM_IN_LARGE', icon: <Move size={16} /> },
    ];

    const items = type === 'control' ? controlItems : positionItems;
    const title = type === 'control' ? '镜头控制' : '镜头位置';

    return (
        <div className="w-64">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={14} className="text-gray-500" />
                </button>
                <span className="font-medium text-sm text-gray-900">{title}</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto py-1">
                {items.map((item) => (
                    <button
                        key={item.value}
                        onClick={() => onSelect(item.value)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                            {item.icon}
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
