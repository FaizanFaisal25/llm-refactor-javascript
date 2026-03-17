"""
Copy surrogate_2 output (LLM-neutralized scripts) into a Chrome-ready directory layout.
Mirrors generateSurrogateForChrome.py but reads from server/output/<site>/surrogate_2/
and writes to server/surrogates_2/.
"""

import os
import shutil

import pandas as pd


def request_response_dic(filename):
    dataset = pd.read_json(filename, lines=True)
    out = {}
    for i in dataset.index:
        if dataset["request_id"][i] not in out:
            out[dataset["request_id"][i]] = dataset["http_req"][i]
    return out


def create_directory_from_url(url, folder_path, file_path):
    url = url.replace("http://", "").replace("https://", "")
    domain_and_path = url.split("/", 1)
    domain = domain_and_path[0]
    path = domain_and_path[1] if len(domain_and_path) > 1 else ""
    full_path = os.path.join(folder_path, domain, path)
    directory, file_name = os.path.split(full_path)
    os.makedirs(directory, exist_ok=True)
    shutil.copy(file_path, os.path.join(directory, file_name))


def main():
    folder_base = "server/output"
    surrogates_out = "server/surrogates_2"
    subdir = "surrogate_2"

    if not os.path.isdir(folder_base):
        print("Directory server/output not found. Run from repo root.")
        return

    for site in os.listdir(folder_base):
        folder = os.path.join(folder_base, site)
        if not os.path.isdir(folder):
            continue
        request_path = os.path.join(folder, "request.json")
        surrogate_dir = os.path.join(folder, subdir)
        if not os.path.isfile(request_path) or not os.path.isdir(surrogate_dir):
            continue
        try:
            print("Converting chrome-based surrogate_2: website:", site)
            request_id = request_response_dic(request_path)
            for fil in os.listdir(surrogate_dir):
                if not fil.endswith("_modified.txt"):
                    continue
                req_id = fil.replace("_modified.txt", "")
                if req_id not in request_id:
                    continue
                req_url = request_id[req_id]
                src = os.path.join(surrogate_dir, fil)
                create_directory_from_url(req_url, surrogates_out, src)
        except Exception as e:
            print("Crashed chrome-based surrogate_2: website:", site, e)


if __name__ == "__main__":
    main()
