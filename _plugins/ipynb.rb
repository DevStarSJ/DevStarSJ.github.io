# Jekyll
# Made by Seongyun Byeon
# ipynb to html

module Jekyll
  class IPythonNotebook < Converter
    safe true
    priority :low

    def matches(ext)
      ext =~ /^\.ipynbref$/i
    end

    def output_ext(ext)
      ".html"
    end

    def convert(content)
      `jupyter nbconvert --to html --template basic --stdout --TemplateExporter.exclude_input_prompt=True --HTMLExporter.anchor_link_text=' ' \`pwd\`/_ipynbs/#{content}`
    end
  end
end