// 通用常量,方便重复使用以及维护脚本
export const HOMEPAGE = {
  URL: 'http://localhost:3000',
  TITLE: 'Dashboard',
  STATUS_AVAILABLE: 'AVAILABLE',
  STATUS_OCCUPIED: 'OCCUPIED',
  // buttons
  BUTTON_REFRESH: 'Refresh',
  BUTTON_BOOK: 'Book',
  BUTTON_RELEASE: 'Release',
};

export const DIALOG = {
  TITLE_PREFIX: 'Book Environment: ',
  LABEL_USER_NAME: 'User Name',
  LABEL_DURATION: 'Duration (Minutes)',
  BUTTON_CLOSE: 'close',
  BUTTON_CONFIRM: 'Confirm Booking',
  BUTTON_CANCEL: 'Cancel',
};

export const POPOVER = {
  TITLE: 'Release Environment',
  DESCRIPTION: 'Are you sure you want to release this environment?',
  BUTTON_NO: 'No',
  BUTTON_YES: 'Yes',
};

export const TOAST = {
  BOOK_SUCCESS_PREFIX: 'Successfully booked: ',
  RELEASE_SUCCESS: 'Environment released',
};
