const { ChimeSDKMeetingsClient } = require('@aws-sdk/client-chime-sdk-meetings');
const { TranscribeStreamingClient } = require('@aws-sdk/client-transcribe-streaming');
const { ChimeSDKMediaPipelinesClient } = require('@aws-sdk/client-chime-sdk-media-pipelines');

// Cliente de reuniones de Amazon Chime
const chimeClient = new ChimeSDKMeetingsClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Cliente de grabación de Amazon Chime Media Pipelines
const chimeMediaClient = new ChimeSDKMediaPipelinesClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Cliente de Amazon Transcribe
const transcribeClient = new TranscribeStreamingClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

module.exports = {
    chimeClient,
    chimeMediaClient,
    transcribeClient
};
