"use strict";
const express = require("express");
const path = require("path");
const app = express();
const routes = require("./router");

// templates, css, and form bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.resolve(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));

// routes
app.use("/", routes);

// start server
const portNumber = 3000;
app.listen(portNumber);
console.log(`To access server: http://localhost:${portNumber}`);
