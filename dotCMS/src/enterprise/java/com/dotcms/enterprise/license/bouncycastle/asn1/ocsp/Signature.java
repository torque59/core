/* 
* Licensed to dotCMS LLC under the dotCMS Enterprise License (the
* “Enterprise License”) found below 
* 
* Copyright (c) 2023 dotCMS Inc.
* 
* With regard to the dotCMS Software and this code:
* 
* This software, source code and associated documentation files (the
* "Software")  may only be modified and used if you (and any entity that
* you represent) have:
* 
* 1. Agreed to and are in compliance with, the dotCMS Subscription Terms
* of Service, available at https://www.dotcms.com/terms (the “Enterprise
* Terms”) or have another agreement governing the licensing and use of the
* Software between you and dotCMS. 2. Each dotCMS instance that uses
* enterprise features enabled by the code in this directory is licensed
* under these agreements and has a separate and valid dotCMS Enterprise
* server key issued by dotCMS.
* 
* Subject to these terms, you are free to modify this Software and publish
* patches to the Software if you agree that dotCMS and/or its licensors
* (as applicable) retain all right, title and interest in and to all such
* modifications and/or patches, and all such modifications and/or patches
* may only be used, copied, modified, displayed, distributed, or otherwise
* exploited with a valid dotCMS Enterprise license for the correct number
* of dotCMS instances.  You agree that dotCMS and/or its licensors (as
* applicable) retain all right, title and interest in and to all such
* modifications.  You are not granted any other rights beyond what is
* expressly stated herein.  Subject to the foregoing, it is forbidden to
* copy, merge, publish, distribute, sublicense, and/or sell the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
* OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
* 
* For all third party components incorporated into the dotCMS Software,
* those components are licensed under the original license provided by the
* owner of the applicable component.
*/

package com.dotcms.enterprise.license.bouncycastle.asn1.ocsp;

import com.dotcms.enterprise.license.bouncycastle.asn1.ASN1Encodable;
import com.dotcms.enterprise.license.bouncycastle.asn1.ASN1EncodableVector;
import com.dotcms.enterprise.license.bouncycastle.asn1.ASN1Sequence;
import com.dotcms.enterprise.license.bouncycastle.asn1.ASN1TaggedObject;
import com.dotcms.enterprise.license.bouncycastle.asn1.DERBitString;
import com.dotcms.enterprise.license.bouncycastle.asn1.DERObject;
import com.dotcms.enterprise.license.bouncycastle.asn1.DERSequence;
import com.dotcms.enterprise.license.bouncycastle.asn1.DERTaggedObject;
import com.dotcms.enterprise.license.bouncycastle.asn1.x509.AlgorithmIdentifier;

public class Signature
    extends ASN1Encodable
{
    AlgorithmIdentifier signatureAlgorithm;
    DERBitString        signature;
    ASN1Sequence        certs;

    public Signature(
        AlgorithmIdentifier signatureAlgorithm,
        DERBitString        signature)
    {
        this.signatureAlgorithm = signatureAlgorithm;
        this.signature = signature;
    }

    public Signature(
        AlgorithmIdentifier signatureAlgorithm,
        DERBitString        signature,
        ASN1Sequence        certs)
    {
        this.signatureAlgorithm = signatureAlgorithm;
        this.signature = signature;
        this.certs = certs;
    }

    public Signature(
        ASN1Sequence    seq)
    {
        signatureAlgorithm  = AlgorithmIdentifier.getInstance(seq.getObjectAt(0));
        signature = (DERBitString)seq.getObjectAt(1);

        if (seq.size() == 3)
        {
            certs = ASN1Sequence.getInstance(
                                (ASN1TaggedObject)seq.getObjectAt(2), true);
        }
    }

    public static Signature getInstance(
        ASN1TaggedObject obj,
        boolean          explicit)
    {
        return getInstance(ASN1Sequence.getInstance(obj, explicit));
    }

    public static Signature getInstance(
        Object  obj)
    {
        if (obj == null || obj instanceof Signature)
        {
            return (Signature)obj;
        }
        else if (obj instanceof ASN1Sequence)
        {
            return new Signature((ASN1Sequence)obj);
        }

        throw new IllegalArgumentException("unknown object in factory: " + obj.getClass().getName());
    }

    public AlgorithmIdentifier getSignatureAlgorithm()
    {
        return signatureAlgorithm;
    }

    public DERBitString getSignature()
    {
        return signature;
    }

    public ASN1Sequence getCerts()
    {
        return certs;
    }

    /**
     * Produce an object suitable for an ASN1OutputStream.
     * <pre>
     * Signature       ::=     SEQUENCE {
     *     signatureAlgorithm      AlgorithmIdentifier,
     *     signature               BIT STRING,
     *     certs               [0] EXPLICIT SEQUENCE OF Certificate OPTIONAL}
     * </pre>
     */
    public DERObject toASN1Object()
    {
        ASN1EncodableVector    v = new ASN1EncodableVector();

        v.add(signatureAlgorithm);
        v.add(signature);

        if (certs != null)
        {
            v.add(new DERTaggedObject(true, 0, certs));
        }

        return new DERSequence(v);
    }
}