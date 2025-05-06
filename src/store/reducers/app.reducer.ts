import {
    SEND_ALERT_CONTENT,
  } from "../actions/action-types";
  
  const initialState = {
    alertText: "",
  };
  
  export default function AppReducer(state = initialState, action: any) {
    const { type, payload } = action;
    switch (type) {
      case SEND_ALERT_CONTENT:
        return {
          ...state,
          alertText: payload,
        };
      default:
        return state;
    }
  }
  