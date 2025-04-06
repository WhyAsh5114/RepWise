import AgoraRTC, { type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

const appId = '989389d78f284ae4bf4524ac7e09e1b3'; // Replace with your Agora app ID

export const agoraClient = AgoraRTC.createClient({
  mode: 'rtc',
  codec: 'vp8'
});

export async function createLocalTracks(): Promise<{
  videoTrack: ICameraVideoTrack;
}> {
  const videoTrack = await AgoraRTC.createCameraVideoTrack();
  return { videoTrack };
}

export async function joinChannel(channelName: string, uid: number) {
  try {
    await agoraClient.join(appId, channelName, null, uid);
    const { videoTrack } = await createLocalTracks();
    await agoraClient.publish([videoTrack]);
    return { videoTrack };
  } catch (error) {
    console.error('Error joining channel:', error);
    throw error;
  }
}

export async function leaveChannel() {
  agoraClient.remoteUsers.forEach((user) => {
    const playerContainer = document.getElementById(`player-${user.uid}`);
    playerContainer?.remove();
  });
  await agoraClient.leave();
}
