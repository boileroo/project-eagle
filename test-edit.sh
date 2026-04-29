sed -i.bak '/body {/i \
  a, button {\
    @apply transition-[filter] duration-200;\
  }\
  a:hover, button:hover {\
    @apply brightness-90;\
  }\
  a:active, button:active {\
    @apply brightness-75;\
  }\
' src/styles/globals.css
