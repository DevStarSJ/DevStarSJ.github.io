#!/bin/bash/

file_name=$1
echo ${file_name}
function converter() {
    jupyter nbconvert --to html --template basic --stdout --TemplateExporter.exclude_input_prompt=True --HTMLExporter.anchor_link_text=' ' `pwd`/_ipynbs/${file_name}.ipynb >> `pwd`/_posts/${file_name}.html
    echo "Success"
}
converter

