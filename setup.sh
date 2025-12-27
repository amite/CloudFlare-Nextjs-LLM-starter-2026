#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Cloudflare + Next.js + LLM Boilerplate Setup           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "${YELLOW}⚠️  Not a git repository. Initializing...${NC}"
    git init
fi

# Get project name from current directory or ask
CURRENT_DIR=$(basename "$PWD")
read -p "$(echo -e ${GREEN}📦 Project name${NC}) [${CURRENT_DIR}]: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-$CURRENT_DIR}

echo ""
echo -e "${BLUE}🔧 Configuration${NC}"
echo ""

# Python microservices
read -p "$(echo -e ${GREEN}🐍 Include Python microservices?${NC}) (y/N): " INCLUDE_PYTHON
INCLUDE_PYTHON=${INCLUDE_PYTHON:-n}

# Example pages
read -p "$(echo -e ${GREEN}📄 Include example pages?${NC}) (Y/n): " INCLUDE_EXAMPLES
INCLUDE_EXAMPLES=${INCLUDE_EXAMPLES:-y}

# Authentication providers
echo ""
echo -e "${GREEN}🔐 Select authentication providers (space-separated):${NC}"
echo "   1) Email/Password"
echo "   2) Google OAuth"
echo "   3) GitHub OAuth"
read -p "Enter choices (e.g., '1 2' or 'all'): " AUTH_CHOICES

echo ""
echo -e "${BLUE}⚙️  Setting up project...${NC}"
echo ""

# Update package.json with project name
echo "📝 Updating package.json..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"name\": \".*\"/\"name\": \"$PROJECT_NAME\"/" package.json
else
    # Linux
    sed -i "s/\"name\": \".*\"/\"name\": \"$PROJECT_NAME\"/" package.json
fi

# Generate AUTH_SECRET
echo "🔑 Generating AUTH_SECRET..."
AUTH_SECRET=$(openssl rand -base64 32)

# Create .env file
echo "📋 Creating .env file..."
cp .env.example .env

# Update .env with generated secret
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/AUTH_SECRET=.*/AUTH_SECRET=$AUTH_SECRET/" .env
else
    sed -i "s/AUTH_SECRET=.*/AUTH_SECRET=$AUTH_SECRET/" .env
fi

# Handle Python microservices
if [[ "$INCLUDE_PYTHON" != "y" && "$INCLUDE_PYTHON" != "Y" ]]; then
    echo "🗑️  Removing Python microservices..."
    rm -rf python-services
    
    # Remove Python-related scripts from package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' '/python:up/d' package.json
        sed -i '' '/python:down/d' package.json
    else
        sed -i '/python:up/d' package.json
        sed -i '/python:down/d' package.json
    fi
    
    # Remove Python API route example
    rm -rf app/api/python
else
    echo "✅ Keeping Python microservices"
    # Add Python service URL to .env
    echo "" >> .env
    echo "# Python Services" >> .env
    echo "PYTHON_SERVICE_URL=http://localhost:8000" >> .env
    echo "PYTHON_SERVICE_SECRET=$(openssl rand -base64 32)" >> .env
fi

# Handle example pages
if [[ "$INCLUDE_EXAMPLES" == "n" || "$INCLUDE_EXAMPLES" == "N" ]]; then
    echo "🗑️  Removing example pages..."
    rm -rf app/examples
    rm -rf components/examples
else
    echo "✅ Keeping example pages"
fi

# Handle auth providers
echo "🔐 Configuring authentication providers..."

# Initialize auth config
AUTH_PROVIDERS=""

if [[ "$AUTH_CHOICES" == "all" ]]; then
    AUTH_PROVIDERS="email google github"
else
    [[ "$AUTH_CHOICES" =~ 1 ]] && AUTH_PROVIDERS+=" email"
    [[ "$AUTH_CHOICES" =~ 2 ]] && AUTH_PROVIDERS+=" google"
    [[ "$AUTH_CHOICES" =~ 3 ]] && AUTH_PROVIDERS+=" github"
fi

# Add provider-specific env vars
if [[ "$AUTH_PROVIDERS" =~ "google" ]]; then
    echo "" >> .env
    echo "# Google OAuth" >> .env
    echo "GOOGLE_CLIENT_ID=your_google_client_id" >> .env
    echo "GOOGLE_CLIENT_SECRET=your_google_client_secret" >> .env
fi

if [[ "$AUTH_PROVIDERS" =~ "github" ]]; then
    echo "" >> .env
    echo "# GitHub OAuth" >> .env
    echo "GITHUB_CLIENT_ID=your_github_client_id" >> .env
    echo "GITHUB_CLIENT_SECRET=your_github_client_secret" >> .env
fi

# Create a config file documenting the choices
cat > .boilerplate-config.json << EOF
{
  "projectName": "$PROJECT_NAME",
  "includePython": $([ "$INCLUDE_PYTHON" = "y" ] || [ "$INCLUDE_PYTHON" = "Y" ] && echo "true" || echo "false"),
  "includeExamples": $([ "$INCLUDE_EXAMPLES" = "y" ] || [ "$INCLUDE_EXAMPLES" = "Y" ] && echo "true" || echo "false"),
  "authProviders": "${AUTH_PROVIDERS}",
  "setupDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"
npm run db:push

echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo -e "${BLUE}📁 Project: ${PROJECT_NAME}${NC}"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo "  1. Add your API keys to .env file"
echo "     - OPENAI_API_KEY or GEMINI_API_KEY"
if [[ "$AUTH_PROVIDERS" =~ "google" ]]; then
    echo "     - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
fi
if [[ "$AUTH_PROVIDERS" =~ "github" ]]; then
    echo "     - GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
fi
echo ""
echo "  2. Start development server:"
echo "     ${GREEN}npm run dev${NC}"
echo ""
if [[ "$INCLUDE_EXAMPLES" == "y" || "$INCLUDE_EXAMPLES" == "Y" ]]; then
    echo "  3. Test examples:"
    echo "     🤖 LLM Streaming: http://localhost:3000/examples/chat"
    echo "     🔢 Database CRUD: http://localhost:3000/examples/counter"
    echo ""
fi
if [[ "$INCLUDE_PYTHON" == "y" || "$INCLUDE_PYTHON" == "Y" ]]; then
    echo "  4. Start Python services:"
    echo "     ${GREEN}npm run python:up${NC}"
    echo ""
fi
echo "  📖 Documentation: ./README.md"
echo ""
echo -e "${GREEN}Happy building! 🎉${NC}"