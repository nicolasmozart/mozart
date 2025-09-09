import { ChimeSDKMeetingsClient } from '@aws-sdk/client-chime-sdk-meetings';
import { TranscribeStreamingClient } from '@aws-sdk/client-transcribe-streaming';
import { ChimeSDKMediaPipelinesClient } from '@aws-sdk/client-chime-sdk-media-pipelines';
import { config } from './env';

// Cliente de reuniones de Amazon Chime
export const chimeClient = new ChimeSDKMeetingsClient({
    region: config.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || ''
    }
});

// Cliente de grabación de Amazon Chime Media Pipelines
export const chimeMediaClient = new ChimeSDKMediaPipelinesClient({
    region: config.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || ''
    }
});

// Cliente de Amazon Transcribe
export const transcribeClient = new TranscribeStreamingClient({
    region: config.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || ''
    }
});

// Configuración adicional para videoconsultas
export const videoCallConfig = {
    defaultRegion: config.AWS_REGION || 'us-east-1',
    s3BucketArn: config.AWS_CHIME_S3_BUCKET_ARN || '',
    maxMeetingDurationMinutes: 120, // 2 horas máximo
    autoStartRecording: true,
    autoStartTranscription: false // Opcional, por defecto desactivado
};

export default {
    chimeClient,
    chimeMediaClient,
    transcribeClient,
    videoCallConfig
};
