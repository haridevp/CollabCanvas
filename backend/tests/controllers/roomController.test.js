/**
 * @fileoverview Unit tests for the roomController.
 * All Mongoose models are mocked to isolate controller logic from the database.
 */

const mongoose = require("mongoose");

// Mock all models and utilities used by the controller
jest.mock("../../models/Room");
jest.mock("../../models/Participant");
jest.mock("../../models/Invitation");
jest.mock("../../models/User");
jest.mock("../../utils/generateRoomCode");
jest.mock("canvas", () => ({
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      fillStyle: "",
      fillRect: jest.fn(),
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "",
      lineJoin: "",
      globalAlpha: 1,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      clearRect: jest.fn(),
      strokeRect: jest.fn(),
      arc: jest.fn(),
      fillText: jest.fn(),
      font: "",
    })),
    toBuffer: jest.fn(() => Buffer.from("test-image")),
  })),
}));

const Room = require("../../models/Room");
const Participant = require("../../models/Participant");
const Invitation = require("../../models/Invitation");
const User = require("../../models/User");
const { generateRoomCode } = require("../../utils/generateRoomCode");

const {
  createRoom,
  joinRoom,
  getPublicRooms,
  getMyRooms,
  updateRoom,
  deleteRoom,
  leaveRoom,
  manageParticipant,
  validateRoom,
  inviteUsers,
  exportDrawing,
} = require("../../controllers/roomController");

// Helpers
const mockRequest = (body = {}, params = {}, query = {}, user = {}) => ({
  body,
  params,
  query,
  user: { _id: new mongoose.Types.ObjectId(), ...user },
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.send = jest.fn();
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── createRoom ──────────────────────────────────────────────────────────────

describe("createRoom", () => {
  test("should create a room and return 201", async () => {
    const roomId = new mongoose.Types.ObjectId();
    const participantId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    generateRoomCode.mockReturnValue("AB12");
    Room.findOne.mockResolvedValue(null); // no existing room with code

    const saveMock = jest.fn();
    const mockRoom = {
      _id: roomId,
      name: "Test Room",
      roomCode: "AB12",
      visibility: "public",
      participants: [],
      save: saveMock,
    };

    Room.mockImplementation(() => mockRoom);

    const mockParticipant = {
      _id: participantId,
      save: jest.fn(),
    };
    Participant.mockImplementation(() => mockParticipant);

    const req = mockRequest(
      { name: "Test Room", description: "A test room", visibility: "public" },
      {},
      {},
      { _id: userId }
    );
    const res = mockResponse();

    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        room: expect.objectContaining({
          name: "Test Room",
          roomCode: "AB12",
        }),
      })
    );
    expect(saveMock).toHaveBeenCalled();
  });

  test("should retry code generation when code already exists", async () => {
    const roomId = new mongoose.Types.ObjectId();

    generateRoomCode
      .mockReturnValueOnce("DUPL")
      .mockReturnValueOnce("UNIQ");

    Room.findOne
      .mockResolvedValueOnce({ roomCode: "DUPL" }) // first code exists
      .mockResolvedValueOnce(null);                  // second is unique

    const mockRoom = {
      _id: roomId,
      name: "Retry Room",
      roomCode: "UNIQ",
      visibility: "public",
      participants: [],
      save: jest.fn(),
    };
    Room.mockImplementation(() => mockRoom);
    Participant.mockImplementation(() => ({
      _id: new mongoose.Types.ObjectId(),
      save: jest.fn(),
    }));

    const req = mockRequest({ name: "Retry Room", visibility: "public" });
    const res = mockResponse();

    await createRoom(req, res);

    expect(generateRoomCode).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should return 400 when save fails", async () => {
    generateRoomCode.mockReturnValue("FAIL");
    Room.findOne.mockResolvedValue(null);
    Room.mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error("Validation failed")),
      participants: [],
    }));

    const req = mockRequest({ name: "" });
    const res = mockResponse();

    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Validation failed" })
    );
  });
});

// ─── joinRoom ────────────────────────────────────────────────────────────────

describe("joinRoom", () => {
  test("should return 404 when room not found", async () => {
    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const req = mockRequest({ roomCode: "XXXX" });
    const res = mockResponse();

    await joinRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Room not found" })
    );
  });

  test("should return 403 for private room with wrong password", async () => {
    const mockRoom = {
      _id: new mongoose.Types.ObjectId(),
      visibility: "private",
      password: "hashed",
      comparePassword: jest.fn().mockResolvedValue(false),
    };

    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoom),
    });

    const req = mockRequest({ roomCode: "PRIV", password: "wrong" });
    const res = mockResponse();

    await joinRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid password" })
    );
  });

  test("should return 400 if already participating", async () => {
    const roomId = new mongoose.Types.ObjectId();
    const mockRoom = {
      _id: roomId,
      visibility: "public",
      participants: [],
      save: jest.fn(),
    };

    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoom),
    });

    Participant.findOne.mockResolvedValue({ _id: "exists" });

    const req = mockRequest({ roomCode: "TEST" });
    const res = mockResponse();

    await joinRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Already participating in this room",
      })
    );
  });

  test("should join room successfully for public room", async () => {
    const roomId = new mongoose.Types.ObjectId();
    const participantId = new mongoose.Types.ObjectId();

    const mockRoom = {
      _id: roomId,
      name: "Public Room",
      roomCode: "PUB1",
      visibility: "public",
      participants: [],
      save: jest.fn(),
    };

    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoom),
    });

    Participant.findOne.mockResolvedValue(null);
    Participant.mockImplementation(() => ({
      _id: participantId,
      role: "participant",
      save: jest.fn(),
    }));

    const req = mockRequest({ roomCode: "PUB1" });
    const res = mockResponse();

    await joinRoom(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        room: expect.objectContaining({ name: "Public Room" }),
      })
    );
  });
});

// ─── getPublicRooms ─────────────────────────────────────────────────────────

describe("getPublicRooms", () => {
  test("should return public rooms with pagination", async () => {
    const mockRooms = [
      { _id: "1", name: "Room 1", visibility: "public" },
      { _id: "2", name: "Room 2", visibility: "public" },
    ];

    Room.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRooms),
          }),
        }),
      }),
    });
    Room.countDocuments.mockResolvedValue(2);

    const req = mockRequest({}, {}, { page: 1, limit: 10 });
    const res = mockResponse();

    await getPublicRooms(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        rooms: mockRooms.map(r => ({ ...r, participantCount: 0 })),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 2,
        }),
      })
    );
  });

  test("should apply search filter when provided", async () => {
    Room.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    Room.countDocuments.mockResolvedValue(0);

    const req = mockRequest({}, {}, { search: "canvas", page: 1, limit: 10 });
    const res = mockResponse();

    await getPublicRooms(req, res);

    expect(Room.find).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: "public",
        isActive: true,
        name: { $regex: "canvas", $options: "i" },
      })
    );
  });
});

// ─── getMyRooms ──────────────────────────────────────────────────────────────

describe("getMyRooms", () => {
  test("should return user rooms", async () => {
    const roomId1 = new mongoose.Types.ObjectId();
    const roomId2 = new mongoose.Types.ObjectId();

    Participant.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { room: roomId1 },
        { room: roomId2 },
      ]),
    });

    const mockRooms = [
      { _id: roomId1, name: "Room A" },
      { _id: roomId2, name: "Room B" },
    ];

    Room.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockRooms),
        }),
      }),
    });

    const req = mockRequest();
    const res = mockResponse();

    await getMyRooms(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        rooms: mockRooms.map(r => ({ ...r, participantCount: 0 })),
      })
    );
  });
});

// ─── updateRoom ──────────────────────────────────────────────────────────────

describe("updateRoom", () => {
  test("should return 404 when room not found or not authorized", async () => {
    Room.findOne.mockResolvedValue(null);

    const req = mockRequest({ name: "Updated" }, { id: "room-id" });
    const res = mockResponse();

    await updateRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should update room successfully", async () => {
    const mockRoom = {
      _id: "room-id",
      name: "Old Name",
      save: jest.fn(),
    };
    Room.findOne.mockResolvedValue(mockRoom);

    const req = mockRequest({ name: "New Name" }, { id: "room-id" });
    const res = mockResponse();

    await updateRoom(req, res);

    expect(mockRoom.name).toBe("New Name");
    expect(mockRoom.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

// ─── deleteRoom ──────────────────────────────────────────────────────────────

describe("deleteRoom", () => {
  test("should return 404 when room not found", async () => {
    Room.findOneAndUpdate.mockResolvedValue(null);

    const req = mockRequest({}, { id: "room-id" });
    const res = mockResponse();

    await deleteRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should soft delete room successfully", async () => {
    Room.findOneAndUpdate.mockResolvedValue({ _id: "room-id", isActive: false });

    const req = mockRequest({}, { id: "room-id" });
    const res = mockResponse();

    await deleteRoom(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

// ─── leaveRoom ────────────────────────────────────────────────────────────────

describe("leaveRoom", () => {
  test("should return 404 when room not found", async () => {
    Room.findOne.mockResolvedValue(null);

    const req = mockRequest({}, { id: "room-id" });
    const res = mockResponse();

    await leaveRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should return 400 when user is not in room", async () => {
    Room.findOne.mockResolvedValue({ _id: "room-id" });
    Participant.findOne.mockResolvedValue(null);

    const req = mockRequest({}, { id: "room-id" });
    const res = mockResponse();

    await leaveRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "You are not in this room" })
    );
  });

  test("should return 403 when owner tries to leave", async () => {
    Room.findOne.mockResolvedValue({ _id: "room-id" });
    Participant.findOne.mockResolvedValue({ role: "owner" });

    const req = mockRequest({}, { id: "room-id" });
    const res = mockResponse();

    await leaveRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("should leave room successfully for a regular participant", async () => {
    const participantId = new mongoose.Types.ObjectId();
    const mockRoom = {
      _id: "room-id",
      participants: [participantId],
      save: jest.fn(),
    };

    Room.findOne.mockResolvedValue(mockRoom);
    Participant.findOne.mockResolvedValue({
      _id: participantId,
      role: "participant",
    });
    Participant.findByIdAndDelete.mockResolvedValue(true);

    const req = mockRequest({}, { id: "room-id" });
    const res = mockResponse();

    await leaveRoom(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Left room successfully",
      })
    );
  });
});

// ─── manageParticipant ───────────────────────────────────────────────────────

describe("manageParticipant", () => {
  test("should return 403 when requester is not in room", async () => {
    Participant.findOne.mockResolvedValueOnce(null);

    const req = mockRequest(
      { action: "promote" },
      { id: "room-id", userId: "user-id" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("should return 404 when target participant not found", async () => {
    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })  // requester
      .mockResolvedValueOnce(null);                // target

    const req = mockRequest(
      { action: "promote" },
      { id: "room-id", userId: "user-id" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should return 400 when trying to act on yourself", async () => {
    const userId = new mongoose.Types.ObjectId();

    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({ role: "participant" });

    const req = mockRequest(
      { action: "promote" },
      { id: "room-id", userId: String(userId) },
      {},
      { _id: userId }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Cannot perform action on yourself",
      })
    );
  });

  test("should promote participant to moderator", async () => {
    const targetParticipant = {
      role: "participant",
      save: jest.fn(),
    };

    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce(targetParticipant);

    const req = mockRequest(
      { action: "promote" },
      { id: "room-id", userId: "other-user" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(targetParticipant.role).toBe("moderator");
    expect(targetParticipant.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Participant promoted to moderator",
      })
    );
  });

  test("should demote moderator to participant", async () => {
    const targetParticipant = {
      role: "moderator",
      save: jest.fn(),
    };

    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce(targetParticipant);

    const req = mockRequest(
      { action: "demote" },
      { id: "room-id", userId: "other-user" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(targetParticipant.role).toBe("participant");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Moderator demoted to participant",
      })
    );
  });

  test("should ban a participant", async () => {
    const targetParticipant = {
      role: "participant",
      isBanned: false,
      save: jest.fn(),
    };

    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce(targetParticipant);

    const req = mockRequest(
      { action: "ban" },
      { id: "room-id", userId: "other-user" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(targetParticipant.isBanned).toBe(true);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Participant banned",
      })
    );
  });

  test("should return 400 for invalid action", async () => {
    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })
      .mockResolvedValueOnce({ role: "participant" });

    const req = mockRequest(
      { action: "invalid-action" },
      { id: "room-id", userId: "other-user" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid action" })
    );
  });

  test("should return 403 when non-owner tries to promote", async () => {
    Participant.findOne
      .mockResolvedValueOnce({ role: "moderator" })
      .mockResolvedValueOnce({ role: "participant" });

    const req = mockRequest(
      { action: "promote" },
      { id: "room-id", userId: "other-user" }
    );
    const res = mockResponse();

    await manageParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Only room owner can promote",
      })
    );
  });
});

// ─── validateRoom ────────────────────────────────────────────────────────────

describe("validateRoom", () => {
  test("should return 404 when room not found", async () => {
    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const req = mockRequest({}, { id: "XXXX" });
    const res = mockResponse();

    await validateRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should return 403 when user is banned", async () => {
    const mockRoom = {
      _id: new mongoose.Types.ObjectId(),
      name: "Test",
      participants: [],
      owner: { username: "owner" },
      visibility: "public",
    };

    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoom),
    });

    Participant.findOne
      .mockResolvedValueOnce(null)   // isParticipant
      .mockResolvedValueOnce(true);  // isBanned

    const req = mockRequest({}, { id: String(mockRoom._id) });
    const res = mockResponse();

    await validateRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "You have been banned from this room",
      })
    );
  });

  test("should return room metadata for valid access", async () => {
    const mockRoom = {
      _id: new mongoose.Types.ObjectId(),
      name: "Valid Room",
      description: "desc",
      participants: ["p1", "p2"],
      owner: { username: "owner" },
      visibility: "public",
      password: null,
    };

    Room.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoom),
    });

    Participant.findOne
      .mockResolvedValueOnce({ _id: "participant" }) // isParticipant
      .mockResolvedValueOnce(null);                   // isBanned

    const req = mockRequest({}, { id: "ABCD" });
    const res = mockResponse();

    await validateRoom(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        room: expect.objectContaining({
          name: "Valid Room",
          isAlreadyMember: true,
          participantCount: 0,
        }),
      })
    );
  });
});

// ─── inviteUsers ─────────────────────────────────────────────────────────────

describe("inviteUsers", () => {
  test("should return 400 when no userIds provided", async () => {
    const req = mockRequest({ userIds: [] }, { id: "room-id" });
    const res = mockResponse();

    await inviteUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("should return 404 when room not found", async () => {
    Room.findOne.mockResolvedValue(null);

    const req = mockRequest(
      { userIds: ["user1"] },
      { id: "room-id" }
    );
    const res = mockResponse();

    await inviteUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should return 403 when requester has no invite permission", async () => {
    Room.findOne.mockResolvedValue({ _id: "room-id" });
    Participant.findOne.mockResolvedValue({ role: "participant" });

    const req = mockRequest(
      { userIds: ["user1"] },
      { id: "room-id" }
    );
    const res = mockResponse();

    await inviteUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("should successfully send invitations", async () => {
    const userId1 = new mongoose.Types.ObjectId();
    Room.findOne.mockResolvedValue({ _id: "room-id" });
    Participant.findOne
      .mockResolvedValueOnce({ role: "owner" })  // requester
      .mockResolvedValueOnce(null);                // not existing participant

    User.find.mockResolvedValue([{ _id: userId1 }]);
    Invitation.findOne.mockResolvedValue(null); // no existing invitation

    const savedInvitation = { _id: "inv1", save: jest.fn() };
    Invitation.mockImplementation(() => savedInvitation);

    const req = mockRequest(
      { userIds: [String(userId1)] },
      { id: "room-id" }
    );
    const res = mockResponse();

    await inviteUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        results: expect.objectContaining({ sent: 1 }),
      })
    );
  });
});

// ─── exportDrawing ───────────────────────────────────────────────────────────

describe("exportDrawing", () => {
  test("should return 404 when room not found", async () => {
    Room.findOne.mockResolvedValue(null);

    const req = mockRequest({}, { id: "room-id" }, { format: "png" });
    const res = mockResponse();

    await exportDrawing(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should return 403 when user is not a participant", async () => {
    Room.findOne.mockResolvedValue({ _id: "room-id" });
    Participant.findOne.mockResolvedValue(null);

    const req = mockRequest({}, { id: "room-id" }, { format: "png" });
    const res = mockResponse();

    await exportDrawing(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("should export drawing as PNG by default", async () => {
    const mockRoom = {
      _id: "room-id",
      name: "Test Room",
      drawingData: [],
    };

    Room.findOne.mockResolvedValue(mockRoom);
    Participant.findOne.mockResolvedValue({ _id: "p1" });

    const req = mockRequest({}, { id: "room-id" }, {});
    const res = mockResponse();

    await exportDrawing(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.send).toHaveBeenCalled();
  });

  test("should export drawing as JPEG when format is jpeg", async () => {
    const mockRoom = {
      _id: "room-id",
      name: "Test Room",
      drawingData: [],
    };

    Room.findOne.mockResolvedValue(mockRoom);
    Participant.findOne.mockResolvedValue({ _id: "p1" });

    const req = mockRequest({}, { id: "room-id" }, { format: "jpeg" });
    const res = mockResponse();

    await exportDrawing(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    expect(res.send).toHaveBeenCalled();
  });
});
