{ pkgs }: {
  deps = [
    pkgs.nodejs
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
  ];
}
