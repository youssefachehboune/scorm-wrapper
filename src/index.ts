"use strict";

// Define UTILS namespace to hold utility functions
namespace UTILS {
    // Function to convert 'boolean strings' into actual valid booleans
    export function StringToBoolean(value: string | number | boolean): boolean {
        const t = typeof value;
        switch (t) {
            case "object":
            case "string":
                return (/(true|1)/i).test(value as string);
            case "number":
                return !!value;
            case "boolean":
                return value as boolean;
            case "undefined":
                return null as any;
            default:
                return false;
        }
    }

    // Function to display error messages when in debug mode
    export function trace(msg: string): void {
        if (SCORM.debug.isActive) {
            if (window.console && window.console.log) {
                window.console.log(msg);
            } else {
                // alert(msg);
            }
        }
    }
}

// Define SCORM namespace to hold all SCORM related functions
namespace SCORM {
    // Define the SCORM API interface to be used throughout the wrapper
    export interface API {
        isFound: boolean;
        handle: any;
    }

    // Define Connection object structure
    export interface Connection {
        isActive: boolean;
    }

    // Define Debug object structure
    export interface Debug {
        isActive: boolean;
    }

    // Define Data object structure
    export interface Data {
        completionStatus: string | null;
        exitStatus: string | null;
    }

    // Define SCORM object structure
    export interface Scorm {
        version: string | null;
        handleCompletionStatus: boolean;
        handleExitMode: boolean;
        API: API;
        connection: Connection;
        data: Data;
        debug: Debug;
    }

    // Create SCORM object
    export const SCORM: Scorm = {
        version: null,
        handleCompletionStatus: true,
        handleExitMode: true,
        API: { handle: null, isFound: false },
        connection: { isActive: false },
        data: { completionStatus: null, exitStatus: null },
        debug: { isActive: false }
    };

    // define SCORM debug mode
    export var debug = SCORM.debug;

    // Function to check if SCORM is available
    export function isAvailable(): boolean {
        return true;
    }

    // Function to find the SCORM API
    export function APIFind(win: any): API {
        // Implementation of APIFind function
        let API: API = { handle: null, isFound: false };
        let findAttempts = 0;
        const findAttemptLimit = 500;
        const traceMsgPrefix = "SCORM.API.find";
        const trace = UTILS.trace;
        const scorm = SCORM;

        while ((!win.API && !win.API_1484_11) &&
            (win.parent) &&
            (win.parent !== win) &&
            (findAttempts <= findAttemptLimit)) {
            findAttempts++;
            win = win.parent;
        }

        // If SCORM version is specified by the user, look for the specific API
        if (scorm.version) {
            switch (scorm.version) {
                case "2004":
                    if (win.API_1484_11) {
                        API = { handle: win.API_1484_11, isFound: true };
                    } else {
                        trace(traceMsgPrefix + ": SCORM version 2004 was specified by the user, but API_1484_11 cannot be found.");
                    }
                    break;
                case "1.2":
                    if (win.API) {
                        API = { handle: win.API, isFound: true };
                    } else {
                        trace(traceMsgPrefix + ": SCORM version 1.2 was specified by the user, but API cannot be found.");
                    }
                    break;
            }
        } else { // If SCORM version is not specified by the user, look for APIs
            if (win.API_1484_11) { // SCORM 2004-specific API
                scorm.version = "2004"; // Set version
                API = { handle: win.API_1484_11, isFound: true };
            } else if (win.API) { // SCORM 1.2-specific API
                scorm.version = "1.2"; // Set version
                API = { handle: win.API, isFound: true };
            }
        }

        if (API.isFound) {
            trace(traceMsgPrefix + ": API found. Version: " + scorm.version);
            trace("API: " + API.handle);
        } else {
            trace(traceMsgPrefix + ": Error finding API. \nFind attempts: " + findAttempts + ". \nFind attempt limit: " + findAttemptLimit);
        }

        return API;


    }

    // Function to get the SCORM API
    export function APIGet(): API {
        let API: API = { handle: null, isFound: false };
        const win = window;
        const trace = UTILS.trace;

        API = APIFind(win);
        if (!API && win.parent && win.parent != win) {
            API = APIFind(win.parent);
        }
        if (!API && win.top && win.top.opener) {
            API = APIFind(win.top.opener);
        }

        if (!API && win.top && win.top.opener && win.top.opener.document) {
            API = APIFind(win.top.opener.document);
        }

        if (API) {
            SCORM.API = API;
        } else {
            trace("API.get failed: Can't find the API!");
        }

        return API;
    }

    // Function to get the handle to the SCORM API object
    export function APIGetHandle(): any {
        // Implementation of APIGetHandle function
        let API: API = SCORM.API;

        if (!API.handle && !API.isFound) {
            API = APIGet();
        }

        return API.handle;
    }

    // Function to initialize the SCORM connection
    export function connectionInitialize(): boolean {
        let success = false;
        let scorm = SCORM;
        let completionStatus = scorm.data.completionStatus;
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.connection.initialize ";

        trace("connectionInitialize called.");

        if (!scorm.connection.isActive) {
            let API = APIGetHandle();
            let errorCode = 0;

            if (API) {
                switch (scorm.version) {
                    case "1.2":
                        success = UTILS.StringToBoolean(API.LMSInitialize(""));
                        break;
                    case "2004":
                        success = UTILS.StringToBoolean(API.Initialize(""));
                        break;
                }
                if (success) {
                    // Double-check that connection is active and working before returning 'true' boolean
                    errorCode = debugGetCode();
                    if (errorCode !== null && errorCode === 0) {
                        scorm.connection.isActive = true;

                        if (scorm.handleCompletionStatus) {
                            completionStatus = status("get");
                            if (completionStatus) {
                                switch (completionStatus) {
                                    case "not attempted": status("set", "incomplete"); break;
                                    case "unknown": status("set", "incomplete"); break;
                                }
                                dataSave();
                            }
                        }
                    }
                    else {
                        success = false;
                        trace(traceMsgPrefix + "Connection issues. \nError code: " + errorCode + " \nError info: " + debugGetInfo(errorCode) + " \nError diagnostic: " + debugGetDiagnosticInfo(errorCode));
                    }
                }
                else {
                    errorCode = debugGetCode();
                    trace(traceMsgPrefix + "Connection issues. \nError code: " + errorCode + " \nError info: " + debugGetInfo(errorCode) + " \nError diagnostic: " + debugGetDiagnosticInfo(errorCode));
                }
            }
            else {
                trace(traceMsgPrefix + "API is null.");
            }
        }
        else {
            trace(traceMsgPrefix + "Connection already active.");
        }

        return success;
    }

    // Function to terminate the SCORM connection
    export function connectionTerminate(): boolean {
        let success = false;
        let scorm = SCORM;
        let exitStatus = scorm.data.exitStatus;
        let completionStatus = scorm.data.completionStatus;
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.connection.terminate ";

        if (scorm.connection.isActive) {
            let API = APIGetHandle();
            let errorCode = 0;

            if (API) {
                if (scorm.handleExitMode && !exitStatus) {
                    if (completionStatus !== "completed" && completionStatus !== "passed") {
                        switch (scorm.version) {
                            case "1.2": success = set("cmi.core.exit", "suspend"); break;
                            case "2004": success = set("cmi.exit", "suspend"); break;
                        }
                    } else {
                        switch (scorm.version) {
                            case "1.2": success = set("cmi.core.exit", "logout"); break;
                            case "2004": success = set("cmi.exit", "normal"); break;
                        }
                    }
                }
                // Ensure we persist the data
                success = save();
                if (success) {
                    switch (scorm.version) {
                        case "1.2": success = UTILS.StringToBoolean(API.LMSFinish("")); break;
                        case "2004": success = UTILS.StringToBoolean(API.Terminate("")); break;
                    }
                    if (success) {
                        scorm.connection.isActive = false;
                    } else {
                        errorCode = debugGetCode();
                        trace(traceMsgPrefix + "failed. \nError code: " + errorCode + " \nError info: " + debugGetInfo(errorCode));
                    }
                }
            } else {
                trace(traceMsgPrefix + "failed: API is null.");
            }
        } else {
            trace(traceMsgPrefix + "aborted: Connection already terminated.");
        }
        return success;
    }

    // Function to get SCORM data
    export function dataGet(parameter: string): string {
        let value = null;
        let scorm = SCORM;
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.data.get(" + parameter + ") ";

        if (scorm.connection.isActive) {
            let API = APIGetHandle();
            let errorCode = 0;

            if (API) {
                switch (scorm.version) {
                    case "1.2":
                        value = API.LMSGetValue(parameter);
                        break;
                    case "2004":
                        value = API.GetValue(parameter);
                        break;
                }
                errorCode = debugGetCode();
                if (value !== "" || errorCode === 0) {
                    switch (parameter) {
                        case "cmi.core.lesson_status":
                        case "cmi.completion_status":
                            scorm.data.completionStatus = value;
                            break;
                        case "cmi.core.exit":
                        case "cmi.exit":
                            scorm.data.exitStatus = value;
                            break;
                    }
                }
                else {
                    trace(traceMsgPrefix + "failed. \nError code: " + errorCode + "\nError info: " + debugGetInfo(errorCode));
                }
            }
            else {
                trace(traceMsgPrefix + "failed: API is null.");
            }
        }
        else {
            trace(traceMsgPrefix + "failed: API connection is inactive.");
        }

        trace(traceMsgPrefix + " value: " + value);
        return String(value);
    }

    // Function to set SCORM data
    export function dataSet(parameter: string, value: string): boolean {

        let success = false;
        let scorm = SCORM;
        let trace = UTILS.trace;
        let makeBoolean = UTILS.StringToBoolean;
        let traceMsgPrefix = "SCORM.data.set(" + parameter + ") ";

        if (scorm.connection.isActive) {
            let API = APIGetHandle();
            let errorCode = 0;

            if (API) {
                switch (scorm.version) {
                    case "1.2": success = makeBoolean(API.LMSSetValue(parameter, value)); break;
                    case "2004": success = makeBoolean(API.SetValue(parameter, value)); break;
                }

                if (success) {
                    if (parameter === "cmi.core.lesson_status" || parameter === "cmi.completion_status") {
                        scorm.data.completionStatus = value;
                    }
                } else {
                    errorCode = debugGetCode();
                    trace(traceMsgPrefix + "failed. \nError code: " + errorCode + ". \nError info: " + debugGetInfo(errorCode));
                }
            } else {
                trace(traceMsgPrefix + "failed: API is null.");
            }
        } else {
            trace(traceMsgPrefix + "failed: API connection is inactive.");
        }

        return success;
    }

    // Function to save SCORM data
    export function dataSave(): boolean {
        let success = false;
        let scorm = SCORM;
        let trace = UTILS.trace;
        let makeBoolean = UTILS.StringToBoolean;
        let traceMsgPrefix = "SCORM.data.save failed";

        if (scorm.connection.isActive) {
            let API = APIGetHandle();
            let errorCode = 0;

            if (API) {
                switch (scorm.version) {
                    case "1.2": success = makeBoolean(API.LMSCommit("")); break;
                    case "2004": success = makeBoolean(API.Commit("")); break;
                }
                if (!success) {
                    errorCode = debugGetCode();
                    trace(traceMsgPrefix + ". \nError code: " + errorCode + ". \nError info: " + debugGetInfo(errorCode));
                }
            } else {
                trace(traceMsgPrefix + ": API is null.");
            }
        } else {
            trace(traceMsgPrefix + ": API connection is inactive.");
        }

        return success;
    }

    // Function to get SCORM status
    export function status(action: string, status?: string): string {
        let success = false;
        let scorm = SCORM;
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.getStatus failed";
        let cmi = "";

        if (action !== null) {
            switch (scorm.version) {
                case "1.2": cmi = "cmi.core.lesson_status"; break;
                case "2004": cmi = "cmi.completion_status"; break;
            }

            switch (action) {
                case "get": success = true; return dataGet(cmi); break;
                case "set": if (status && status !== null){
                    success = dataSet(cmi, status);
                }
                    else { success = false; 
                        trace(traceMsgPrefix + ": status was not specified."); }
                    break;
                default: success = false; trace(traceMsgPrefix + ": no valid action was specified."); break;
            }
        }
        else {
            trace(traceMsgPrefix + ": action was not specified.");
        }

        return String(success);
    }

    // Function to get the SCORM error code
    export function debugGetCode(): number {
        let API = APIGetHandle();
        let scorm = SCORM;
        let code = 0;
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.debug.getCode ";

        if (API) {
            switch (scorm.version) {
                case "1.2": code = parseInt(API.LMSGetLastError(), 10); break;
                case "2004": code = parseInt(API.GetLastError(), 10); break;
            }
        } else {
            trace(traceMsgPrefix + ": API is null.");
        }

        return code;
    }

    // Function to get the SCORM error info
    export function debugGetInfo(errorCode: number): string {
        let API = APIGetHandle();
        let scorm = SCORM;
        let result = "";
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.debug.getInfo ";

        if (API) {
            switch (scorm.version) {
                case "1.2": result = API.LMSGetErrorString(errorCode.toString()); break;
                case "2004": result = API.GetErrorString(errorCode.toString()); break;
            }
        } else {
            trace(traceMsgPrefix + ": API is null.");
        }

        return String(result);
    }

    // Function to get additional diagnostic information for the SCORM error code
    export function debugGetDiagnosticInfo(errorCode: number): string {
        let API = APIGetHandle();
        let scorm = SCORM;
        let result = "";
        let trace = UTILS.trace;
        let traceMsgPrefix = "SCORM.debug.getDiagnosticInfo ";

        if (API) {
            switch (scorm.version) {
                case "1.2": result = API.LMSGetDiagnostic(errorCode.toString()); break;
                case "2004": result = API.GetDiagnostic(errorCode.toString()); break;
            }
        } else {
            trace(traceMsgPrefix + ": API is null.");
        }

        return String(result);
    }

    // Shortcuts for commonly used functions
    export const init = connectionInitialize;
    export const get = dataGet;
    export const set = dataSet;
    export const save = dataSave;
    export const quit = connectionTerminate;
}


export default SCORM;
export var debug = SCORM.debug;