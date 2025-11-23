
/**
 * 直接调用 Google Flow API 延长视频
 */
export async function generateVideoExtendDirectly(
    mediaId: string,
    prompt: string,
    bearerToken: string,
    sessionId: string,
    projectId: string,
    aspectRatio: '16:9' | '9:16' | '1:1',
    accountTier: 'pro' | 'ultra',
    videoModel: 'quality' | 'fast',
    startFrameIndex?: number,
    endFrameIndex?: number,
    seed?: number,
    sceneId?: string
): Promise<{
    operationName: string;
    sceneId: string;
    status: string;
    remainingCredits?: number;
}> {
    const url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoExtendVideo';

    // 规范化视频宽高比
    const normalizedAspect = aspectRatio === '9:16'
        ? 'VIDEO_ASPECT_RATIO_PORTRAIT'
        : aspectRatio === '1:1'
            ? 'VIDEO_ASPECT_RATIO_SQUARE'
            : 'VIDEO_ASPECT_RATIO_LANDSCAPE';

    // 行级注释：根据宽高比、账号类型和视频模型选择 videoModelKey
    // 格式：veo_3_1_extend_{quality|fast}_{landscape|portrait|square}_{ultra|}
    const aspectSuffix = aspectRatio === '9:16'
        ? 'portrait'
        : aspectRatio === '1:1'
            ? 'square'
            : 'landscape';

    const tierSuffix = accountTier === 'ultra' ? '_ultra' : '';
    const videoModelKey = `veo_3_1_extend_${videoModel}_${aspectSuffix}${tierSuffix}`;

    const requestSeed = typeof seed === 'number'
        ? seed
        : Math.floor(Math.random() * 100_000);

    const generatedSceneId = sceneId && sceneId.trim()
        ? sceneId.trim()
        : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    // 行级注释：默认使用视频的最后 24 帧（约 1 秒，假设 24fps）
    const finalStartFrameIndex = startFrameIndex !== undefined ? startFrameIndex : 168;
    const finalEndFrameIndex = endFrameIndex !== undefined ? endFrameIndex : 191;

    const payload = {
        clientContext: {
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: 'PINHOLE',
            userPaygateTier: accountTier === 'ultra' ? 'PAYGATE_TIER_TWO' : 'PAYGATE_TIER_ONE',
        },
        requests: [
            {
                textInput: {
                    prompt: prompt.trim(),
                },
                videoInput: {
                    mediaId: mediaId.trim(),
                    startFrameIndex: finalStartFrameIndex,
                    endFrameIndex: finalEndFrameIndex,
                },
                videoModelKey,
                aspectRatio: normalizedAspect,
                seed: requestSeed,
                metadata: {
                    sceneId: generatedSceneId,
                },
            },
        ],
    };

    console.log('🎬 直接调用 Google API 延长视频:', {
        mediaId: mediaId.substring(0, 20) + '...',
        prompt,
        videoModelKey,
        frames: `${finalStartFrameIndex}-${finalEndFrameIndex}`,
        sceneId: generatedSceneId,
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8',
                'Authorization': `Bearer ${bearerToken}`,
                'Origin': 'https://labs.google',
                'Referer': 'https://labs.google/',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ 视频延长失败:', errorData);
            throw new Error(`Video extend failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ 视频延长任务已提交');

        const operations = data.operations || [];
        if (operations.length === 0) {
            throw new Error('No operations in response');
        }

        const operation = operations[0];

        return {
            operationName: operation?.operation?.name || '',
            sceneId: operation?.sceneId || generatedSceneId,
            status: operation?.status || 'MEDIA_GENERATION_STATUS_PENDING',
            remainingCredits: data.remainingCredits,
        };
    } catch (error) {
        console.error('❌ 直接生成视频（延长）失败:', error);
        throw error;
    }
}
