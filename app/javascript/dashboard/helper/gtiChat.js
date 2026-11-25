// GTI "Work" chat screen: WhatsApp-style bubbles and the Ticketz-style actions
// on top of a conversation (Accept, Return to queue, Resolve, Reopen).
import {
  MESSAGE_VARIANTS,
  ORIENTATION,
} from 'dashboard/components-next/message/constants';
import wootConstants from 'dashboard/constants/globals';

export const GTI_BUBBLE_VARIANTS = {
  [MESSAGE_VARIANTS.USER]:
    'bg-n-gti-in dark:bg-n-gti-in-dark text-n-slate-12 shadow-sm',
  [MESSAGE_VARIANTS.AGENT]:
    'bg-n-gti-out dark:bg-n-gti-out-dark text-n-slate-12 shadow-sm',
};

export const GTI_BUBBLE_ORIENTATION = {
  [ORIENTATION.LEFT]:
    'left-bubble rounded-lg ltr:rounded-tl-none rtl:rounded-tr-none',
  [ORIENTATION.RIGHT]:
    'right-bubble rounded-lg ltr:rounded-tr-none rtl:rounded-tl-none',
};

export const GTI_CHAT_ACTIONS = {
  ACCEPT: 'accept',
  RETURN: 'return',
  RESOLVE: 'resolve',
  REOPEN: 'reopen',
  TRANSFER: 'transfer',
};

const { STATUS_TYPE } = wootConstants;

// Which buttons the header shows: a waiting conversation (open, nobody on it)
// can be accepted, one being attended can go back to the queue or be resolved,
// and a closed one can only be reopened.
export const gtiChatActions = chat => {
  const { ACCEPT, RETURN, RESOLVE, REOPEN, TRANSFER } = GTI_CHAT_ACTIONS;
  if (chat.status === STATUS_TYPE.RESOLVED) {
    return [REOPEN];
  }
  if (chat.status === STATUS_TYPE.OPEN && !chat.meta?.assignee) {
    return [ACCEPT, RESOLVE, TRANSFER];
  }
  if (chat.status === STATUS_TYPE.OPEN) {
    return [RETURN, RESOLVE, TRANSFER];
  }
  return [REOPEN, TRANSFER];
};

// WhatsApp-like wallpaper behind the messages: beige (dark navy at night) with
// a faint dot grid.
export const GTI_CHAT_WALLPAPER =
  '!bg-n-gti-chat dark:!bg-n-gti-chat-dark bg-[radial-gradient(rgba(127,127,127,0.07)_1px,transparent_1px)] bg-[length:1.125rem_1.125rem]';
