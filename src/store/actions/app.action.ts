import {
  SEND_ALERT_CONTENT,
} from "./action-types";

export const changeAlertContent = (text: string) => {
  return {
    type: SEND_ALERT_CONTENT,
    payload: text,
  };
};