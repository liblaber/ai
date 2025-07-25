const path = require('path');

module.exports = {
  // Ignore the starters directory and other common exclusions
  watchOptions: {
    ignored: [
      '**/node_modules/**',
      '**/starters/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.nyc_output/**',
      '**/prisma/migrations/**',
      '**/*.log',
      '**/public/**',
      '**/assets/**',
      '**/icons/**',
      '**/screenshots/**',
      '**/videos/**',
      '**/diagrams/**',
      '**/shared/**',
    ],
  },

  // Additional webpack configuration
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'app'),
      '@components': path.resolve(__dirname, 'app/components'),
      '@lib': path.resolve(__dirname, 'app/lib'),
      '@utils': path.resolve(__dirname, 'app/utils'),
      '@types': path.resolve(__dirname, 'app/types'),
      '@styles': path.resolve(__dirname, 'app/styles'),
    },
  },

  // Module rules for handling different file types
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: [/node_modules/, /starters/, /shared/],
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: [/node_modules/, /starters/, /shared/],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.(css|scss)$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
        loader: 'postcss-loader',
        exclude: [/node_modules/, /starters/, /shared/],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },

  // Optimization settings
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },

  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
};
