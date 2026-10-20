/** Replace this boundary after Kugou supplies its documented JSBridge.
 * No fake Kugou endpoints or native method names are used in local mode.
 */
export const playerAdapter = {
 mode: 'local',
 connect(implementation) { this.implementation = implementation; },
 async getContext() { return { song: this.implementation?.getSong() || null, position: this.implementation?.getPosition() || 0, source: 'local-player' }; },
 async playSong(songID, position = 0) { return this.implementation?.playSong(songID, position); },
};
