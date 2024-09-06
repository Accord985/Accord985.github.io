// Use nodemon to start the test server:
//    "nodemon" in cmd
// 127.0.0.1:8000

'use strict';
const express = require("express");
const app = express();
app.use(express.static('./public/'));
const PORT = process.env.PORT || 8000;
app.listen(PORT);
