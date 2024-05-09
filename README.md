# Redirector
A simple and lightweight URL redirector for set services and locations, easily configurable and usable.

This was mainly made for [my hosted frontends](https://ggtyler.dev/other/frontends) -
this can be used for other stuff, but you may want to tweak the design for your own use.

This project was made in the span of a few hours - although it looks intact, please be wary of bugs.

## Installation
1. Clone this repository to your server
2. Rename `config.toml.example` to `config.toml`
3. Edit `config.toml` in a text editor and configure accordingly
4. Install packages with `yarn`
5. Build the client-side page with `yarn build`
6. Start the server with `yarn start`

This is meant to be used in conjunction with a reverse proxy, such as nginx. Make sure
you're passing the Host header, like so:
```nginx
location / {
    proxy_pass http://127.0.0.1:8008;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote-addr;
}
```

## License
This project is licensed under [GPL 3.0.](https://www.gnu.org/licenses/gpl-3.0.en.html)