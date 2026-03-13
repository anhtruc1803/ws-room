// ============================================================
// Vietnamese translations
// ============================================================

import type { TranslationKeys } from "./en";

const vi: TranslationKeys = {
  // ── Chung ────────────────────────────────────────────────
  common: {
    loading: "Đang tải...",
    error: "Lỗi",
    confirm: "Xác nhận",
    cancel: "Hủy",
    close: "Đóng",
    copy: "Sao chép",
    join: "Tham gia",
    create: "Tạo",
    or: "hoặc",
  },

  // ── Trang chủ ────────────────────────────────────────────
  landing: {
    subtitle:
      "Phòng xử lý sự cố tạm thời. Tạo phòng, mời đội ngũ, giải quyết sự cố. Mọi dữ liệu tự động xóa.",
    createRoom: "Tạo phòng sự cố",
    orJoinExisting: "hoặc tham gia phòng có sẵn",
    enterRoomCode: "Nhập mã phòng",
    joinButton: "Vào",
    featureEncrypted: "Mã hóa & Tạm thời",
    featureRealtime: "Chat thời gian thực",
    featureAutoDelete: "Tự động xóa",
  },

  // ── Tạo phòng ────────────────────────────────────────────
  createRoom: {
    title: "Tạo phòng sự cố",
    description: "Thiết lập không gian cộng tác tạm thời cho đội ngũ của bạn.",
    incidentTitle: "Tên sự cố",
    incidentTitlePlaceholder: "VD: Sập database - Production",
    descriptionLabel: "Mô tả (không bắt buộc)",
    descriptionPlaceholder: "Mô tả ngắn gọn về sự cố...",
    displayName: "Tên hiển thị của bạn",
    displayNamePlaceholder: "VD: Minh (DevOps)",
    roomDuration: "Thời gian phòng",
    requirePassword: "Yêu cầu mật khẩu để tham gia",
    roomPassword: "Mật khẩu phòng",
    createButton: "Tạo phòng",
    errorTitleRequired: "Tên sự cố là bắt buộc",
    errorNameRequired: "Tên hiển thị là bắt buộc",
    errorCreateFailed: "Tạo phòng thất bại",
    duration15m: "15 phút",
    duration30m: "30 phút",
    duration1h: "1 giờ",
    duration2h: "2 giờ",
    duration4h: "4 giờ",
    duration8h: "8 giờ",
    duration24h: "24 giờ",
  },

  // ── Tham gia phòng ────────────────────────────────────────
  joinRoom: {
    title: "Tham gia phòng sự cố",
    roomCode: "Mã phòng",
    displayName: "Tên hiển thị của bạn",
    displayNamePlaceholder: "VD: Hùng (Backend)",
    roomPassword: "Mật khẩu phòng",
    roomPasswordPlaceholder: "Nhập mật khẩu phòng",
    joinButton: "Vào phòng",
    errorNameRequired: "Tên hiển thị là bắt buộc",
    errorJoinFailed: "Tham gia phòng thất bại",
  },

  // ── Trang phòng ────────────────────────────────────────────
  room: {
    loadingRoom: "Đang tải phòng...",
    cannotAccess: "Không thể truy cập phòng",
    roomNotFound: "Không tìm thấy phòng",
    returnHome: "Về trang chủ",
    connecting: "Đang kết nối...",
    roomEnded: "Phòng đã kết thúc. Tin nhắn chỉ đọc.",
    confirmEndRoom:
      "Bạn có chắc chắn muốn kết thúc phòng? Hành động này không thể hoàn tác.",
    errorEndRoom: "Kết thúc phòng thất bại",
  },

  // ── Header phòng ──────────────────────────────────────────
  roomHeader: {
    ended: "Đã kết thúc",
    endRoom: "Kết thúc",
    copyInviteLink: "Sao chép link mời",
    expired: "Hết hạn",
  },

  // ── Khu vực chat ──────────────────────────────────────────
  chat: {
    noMessages: "Chưa có tin nhắn. Hãy bắt đầu trao đổi.",
    typePlaceholder: "Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)",
    roomEndedPlaceholder: "Phòng đã kết thúc",
    uploadFile: "Tải file lên",
    fileTooLarge: "File quá lớn. Kích thước tối đa là {size}MB",
    uploadFailed: "Tải file thất bại",
  },

  // ── Thành viên ────────────────────────────────────────────
  participants: {
    title: "Thành viên",
    you: "(bạn)",
    owner: "CHỦ PHÒNG",
  },
};

export default vi;
