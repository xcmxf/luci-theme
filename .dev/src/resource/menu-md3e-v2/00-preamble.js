"use strict";
"require baseclass";
"require ui";
"require request";

const MOBILE_LAYOUT_MAX_WIDTH = 920;
const MOBILE_LAYOUT_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;

return baseclass.extend({
