# SCORM Wrapper

A TypeScript-based SCORM Wrapper for integrating SCORM functionality into your web applications.

## Installation

```bash
npm install scorm-wrapper
```
## Usage
### 1. Import the SCORM Wrapper
``` javascript
import SCORMWrapper from 'scorm-wrapper';
```
### 2. Initialize SCORM Connection
``` javascript
// Initialize SCORM connection
SCORMWrapper.init();
```
### 3. Get SCORM Data
``` javascript
const completionStatus = SCORMWrapper.get('cmi.completion_status');
console.log('Completion Status:', completionStatus);
```
### 4. Set SCORM Data
``` javascript
// Set completion status to 'completed'
SCORMWrapper.set('cmi.completion_status', 'completed');
```
### 5. Save SCORM Data
``` javascript
// Save changes
SCORMWrapper.save();
```
### 6. Terminate SCORM Connection
``` javascript
// Terminate SCORM connection
SCORMWrapper.quit();
```
## API Reference
`init()`
Initialize the SCORM connection.

`get(parameter: string): any`
Get SCORM data for the specified parameter.

`set(parameter: string, value: any): boolean`
Set SCORM data for the specified parameter.

`save(): boolean`
Save changes made to SCORM data.

`quit(): boolean`
Terminate the SCORM connection.

## Contributing
Feel free to contribute to this project by opening issues or submitting pull requests.
