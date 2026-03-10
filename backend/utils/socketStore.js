/**
 * Shared module-level store for the Socket.io server instance.
 * Allows REST controllers to query live socket connections.
 */
let _io = null;

module.exports = {
    setIO(io) {
        _io = io;
    },
    getIO() {
        return _io;
    },
    /**
     * Returns the number of unique users currently connected to a room.
     * @param {string} roomId - The canonical MongoDB room _id
     * @returns {number}
     */
    getLiveUserCount(roomId) {
        if (!_io) return 0;
        const socketsInRoom = _io.sockets.adapter.rooms.get(roomId);
        if (!socketsInRoom || socketsInRoom.size === 0) return 0;

        const userIds = new Set();
        for (const sid of socketsInRoom) {
            const s = _io.sockets.sockets.get(sid);
            if (s && s.data && s.data.userId) {
                userIds.add(s.data.userId);
            }
        }
        return userIds.size;
    }
};
