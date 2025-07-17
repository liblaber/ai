echo ""
echo "        ┬  ┬┌┐ ┬  ┌─┐┌┐   ┌─┐┬"
echo "        │  │├┴┐│  ├─┤├┴┐  ├─┤│"
echo "        ┴─┘┴└─┘┴─┘┴ ┴└─┘  ┴ ┴┴"
echo ""
echo "Do you want to run the liblab AI builder? (y/n)"
read -p "" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Starting liblab AI builder..."
    pnpm run dev
else
    echo ""
    echo "You can run it later using:"
    echo ""
    echo "\033[1;32mpnpm run dev\033[0m"
    echo ""
fi
