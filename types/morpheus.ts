export interface Project {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    createdAt: Date;
    type: 'image' | 'text' | 'video';
}

export enum ViewMode {
    LANDING = 'LANDING',
    DASHBOARD = 'DASHBOARD',
}

export interface CreateProjectParams {
    prompt: string;
    type: 'image' | 'text';
}
